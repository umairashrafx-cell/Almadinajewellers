import { storeSchemaNode } from "@/lib/store-schema";

/** JewelryStore schema, which is what feeds a Google Business listing. */
export function StoreSchema() {
  return (
    <script
      type="application/ld+json"
      // Our own configuration, serialised. No user input reaches it.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...storeSchemaNode() }),
      }}
    />
  );
}
