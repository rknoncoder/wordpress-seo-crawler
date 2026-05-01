import basicSeoAudit from "./basicSeoAudit.js";
import schemaAudit from "./schemaAudit.js";
import articleAudit from "./articleAudit.js";
import ecommerceAudit from "./ecommerceAudit.js";
import categoryPaginationAudit from "./categoryPaginationAudit.js";
import facetedNavigationAudit from "./facetedNavigationAudit.js";
import localSeoAudit from "./localSeoAudit.js";
import courseAudit from "./courseAudit.js";

export default function runAudits(pages, siteProfile) {
  return [
    ...basicSeoAudit(pages),
    ...schemaAudit(pages),
    ...articleAudit(pages),
    ...ecommerceAudit(pages, siteProfile),
    ...categoryPaginationAudit(pages),
    ...facetedNavigationAudit(pages),
    ...localSeoAudit(pages, siteProfile),
    ...courseAudit(pages)
  ];
}
