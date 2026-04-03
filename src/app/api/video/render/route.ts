// Remotion Lambda render endpoint.
// When REMOTION_LAMBDA_FUNCTION_NAME is not configured, returns a 503 with a clear message.
// To enable: deploy a Remotion Lambda function and set the env vars below.
//
// Required env vars (when enabling Lambda):
//   REMOTION_LAMBDA_FUNCTION_NAME  — deployed function name
//   REMOTION_LAMBDA_REGION         — AWS region (default: us-east-1)
//   AWS_ACCESS_KEY_ID              — IAM key with lambda:InvokeFunction
//   AWS_SECRET_ACCESS_KEY

export async function POST(req: Request) {
  const functionName = process.env.REMOTION_LAMBDA_FUNCTION_NAME;

  if (!functionName) {
    return Response.json(
      {
        error: "Lambda render not configured",
        message: "Set REMOTION_LAMBDA_FUNCTION_NAME, REMOTION_LAMBDA_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY to enable video rendering.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const lambdaClient = await import("@remotion/lambda/client");
    const renderMedia = lambdaClient.renderMediaOnLambda;

    const region = (process.env.REMOTION_LAMBDA_REGION ?? "us-east-1") as Parameters<typeof renderMedia>[0]["region"];

    const { renderId, bucketName } = await renderMedia({
      region,
      functionName,
      serveUrl: process.env.REMOTION_SERVE_URL ?? "",
      composition: "VideoAd",
      inputProps: body.data,
      codec: "h264",
      imageFormat: "jpeg",
    });

    return Response.json({ renderId, bucketName });
  } catch (err) {
    console.error("[api/video/render]", err);
    return Response.json({ error: "Render failed" }, { status: 500 });
  }
}
