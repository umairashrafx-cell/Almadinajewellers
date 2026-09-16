import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import type { SavedCalculation } from "@/lib/admin";
import { rateStampParts } from "@/lib/rates";
import { SITE, formatPKR } from "@/lib/site";

const grams = (value: number) => `${value.toFixed(3)} g`;
const rupees = (value: number) => formatPKR(Math.round(value));

/**
 * Prints a saved calculation as a bill with the shop's heading.
 *
 * The bill is rendered into the page only while printing, as a direct child of
 * `<body>`, and a print rule in styles.css hides everything else. That keeps it
 * sized for the shop's 4 x 6 inch paper in the browser's own print dialog — no pop-up window to be blocked,
 * and the same on a phone as on the counter PC.
 */
export function PrintBillButton({
  calc,
  size = "sm",
  variant = "outline",
  className,
}: {
  calc: SavedCalculation;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    // A frame first, so the bill is in the page before the dialog snapshots it.
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [printing]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setPrinting(true)}
        className={className}
      >
        <Printer aria-hidden="true" />
        Print
      </Button>
      {printing ? createPortal(<Bill calc={calc} />, document.body) : null}
    </>
  );
}

function Bill({ calc }: { calc: SavedCalculation }) {
  const selling = calc.mode === "selling";
  const parts = rateStampParts(calc.created_at);
  const extra = calc.lines.reduce((sum, line) => sum + line.extra, 0);

  return (
    <div className="print-bill">
      <header className="print-bill-head">
        <h1>{SITE.name}</h1>
        <p>
          <strong>Proprietor:</strong> {SITE.proprietor}
        </p>
        <p>{SITE.address}</p>
        <p>
          <strong>Cell:</strong> {SITE.cellNumbers.join(", ")}
        </p>
      </header>

      <div className="print-bill-meta">
        <p>
          <strong>Customer:</strong> {calc.customer_name}
        </p>
        <p>
          {selling ? "Sale" : "Purchase"}
          {parts ? ` · ${parts.date} · ${parts.time}` : ""}
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Weight</th>
            <th>{selling ? "Polish" : "Kaat"}</th>
            <th>{selling ? "Total" : "24k"}</th>
            <th className="num">Amount</th>
          </tr>
        </thead>
        {calc.lines.map((line, index) => (
          <tbody key={index}>
            <tr>
              <td>{index + 1}</td>
              <td>{grams(line.weight)}</td>
              <td>{grams(line.extra)}</td>
              <td>{grams(line.billed)}</td>
              <td className="num">{rupees(line.amount)}</td>
            </tr>
            <tr className="print-bill-sub">
              <td />
              <td colSpan={4}>
                {selling ? `Polish ${line.factor} g/tola` : `Kaat ${line.factor} rati/tola`} · Rate{" "}
                {rupees(line.rate)}/tola
              </td>
            </tr>
          </tbody>
        ))}
        <tfoot>
          <tr>
            <td />
            <td>{grams(calc.total_weight_g)}</td>
            <td>{grams(extra)}</td>
            <td>{grams(calc.total_billed_g)}</td>
            <td />
          </tr>
        </tfoot>
      </table>

      <p className="print-bill-total">
        {selling ? "Customer pays" : "We pay"}: <strong>{formatPKR(calc.total_amount_pkr)}</strong>
      </p>

      <footer className="print-bill-foot">
        <p>Thank you for your trust.</p>
        <p className="print-bill-sign">Signature</p>
      </footer>
    </div>
  );
}
