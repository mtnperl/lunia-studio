/**
 * Read a JSON response without turning an infrastructure failure into a
 * parser error.
 *
 * `await res.json()` on a route that timed out or crashed at the edge throws
 * `Unexpected token 'A', "An error o"... is not valid JSON`, because the
 * platform served an HTML or plain-text error page. That string reached the
 * builder verbatim and read like a bug in the hook writer. It is not: it is
 * the deployment saying the function did not finish.
 *
 * This reads the body once as text, parses it when it is JSON, and otherwise
 * throws a sentence that names what actually happened.
 */
export async function readJsonResponse<T = unknown>(res: Response, what = "request"): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    if (res.status === 504 || /timed? ?out/i.test(text)) {
      throw new Error(`The ${what} took too long and the server gave up. Try again.`);
    }
    if (!res.ok) {
      throw new Error(`The server returned ${res.status} on the ${what}. Try again.`);
    }
    throw new Error(`The ${what} came back in a form we could not read. Try again.`);
  }
}
