import { NextResponse } from "next/server";
import { privateKeyToAccount } from "viem/accounts";

import { isHexPrivateKey } from "@verifier-facilitator/shared";

import { loadRootEnv } from "../env";

export const dynamic = "force-dynamic";

export async function GET() {
  loadRootEnv();
  const privateKey = process.env.EVM_PRIVATE_KEY;

  if (!privateKey || !isHexPrivateKey(privateKey) || /^0x0{64}$/i.test(privateKey)) {
    return NextResponse.json(
      {
        configured: false,
        address: null,
        error: "EVM_PRIVATE_KEY is not configured."
      },
      { status: 200 }
    );
  }

  const account = privateKeyToAccount(privateKey);

  return NextResponse.json({
    configured: true,
    address: account.address
  });
}
