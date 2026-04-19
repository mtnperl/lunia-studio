import { verifyEnvPassword } from "@/lib/password-gate";

export function POST(req: Request): Promise<Response> {
  return verifyEnvPassword(req, "UGC_PASSWORD");
}
