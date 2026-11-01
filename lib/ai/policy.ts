export function assertAiPolicy(consent: boolean) {
  if (!consent)
    throw new Error(
      "Explicit consent to send selected content to Qwen is required",
    );
  if (
    process.env.QWEN_FREE_QUOTA_VERIFIED !== "true" ||
    !process.env.QWEN_QUOTA_VERIFIED_AT ||
    !process.env.QWEN_QUOTA_VERIFICATION_EXPIRES_AT ||
    !Number.isFinite(
      Date.parse(process.env.QWEN_QUOTA_VERIFICATION_EXPIRES_AT),
    ) ||
    Date.parse(process.env.QWEN_QUOTA_VERIFICATION_EXPIRES_AT) < Date.now() ||
    !Number.isFinite(Date.parse(process.env.QWEN_QUOTA_VERIFIED_AT)) ||
    Date.parse(process.env.QWEN_QUOTA_VERIFIED_AT) > Date.now() ||
    process.env.QWEN_ENABLED !== "true"
  )
    throw new Error(
      "AI disabled: current Free Quota Only entitlement has not been verified for Syrka Mail",
    );
  if (!process.env.QWEN_MODEL || !process.env.QWEN_API_KEY)
    throw new Error(
      "Qwen model entitlement and credentials are not configured",
    );
}
