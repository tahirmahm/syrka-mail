export function SyrkaSymbol({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="128 490 1320 590"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M183 523 754 969 Q759 973 758 980 L758 991 692 1037 M1404 523 832 969 Q827 973 828 980 L828 991 893 1037"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function Brand() {
  return (
    <span className="syrka-brand">
      <SyrkaSymbol />
      <span className="brand-divider" />
      <span className="syrka-wordmark">SYRKΛ</span>
      <span className="brand-mail">Mail</span>
    </span>
  );
}
