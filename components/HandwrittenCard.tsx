export default function HandwrittenCard({
  message,
  recipient,
  address,
}: {
  message: string;
  recipient?: string;
  address?: string | null;
}) {
  return (
    <div className="paper rounded-xl p-6 shadow-inner">
      <p className="font-hand text-[22px] leading-7 whitespace-pre-wrap">{message}</p>
      {(recipient || address) && (
        <div className="mt-4 border-t border-black/10 pt-3 text-xs text-black/50">
          {recipient} {address ? `· ${address}` : "· adresse bureau en cours d'enrichissement"}
        </div>
      )}
    </div>
  );
}
