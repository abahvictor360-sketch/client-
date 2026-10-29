import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import type { Prospect } from "@/lib/types";
import { personName } from "../data";

export type PersonRow = Pick<Prospect, "id" | "first_name" | "last_name" | "title" | "company" | "email" | "segment_id" | "status" | "city" | "country" | "linkedin_url">;

export function PeopleTable({ businessId, rows, segmentNames }: { businessId: string; rows: PersonRow[]; segmentNames: Record<string, string> }) {
  return (
    <section aria-label="People" className="panel overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Company</th>
            <th scope="col">Buyer type</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="min-w-48">
                <Link href={`/app/b/${businessId}/inbox?p=${p.id}&all=1`} className="font-semibold underline-offset-4 hover:underline">{personName(p)}</Link>
                <p className="text-muted">{p.title}</p>
              </td>
              <td className="min-w-48">
                <p>{p.company}</p>
                <p className="text-muted [overflow-wrap:anywhere]">{p.email}</p>
                {(p.city || p.country) && <p className="text-xs text-muted">{[p.city, p.country].filter(Boolean).join(", ")}</p>}
              </td>
              <td className="text-muted">{segmentNames[p.segment_id]}</td>
              <td><StatusPill status={p.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
