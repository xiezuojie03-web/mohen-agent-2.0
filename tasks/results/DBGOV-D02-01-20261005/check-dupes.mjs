import { queryRows } from "../../../packages/data-access/src/index.mjs";

async function main() {
  const total = await queryRows(`select count(*) as c from research_observation`);
  const dup = await queryRows(
    `select count(*) as c from (
       select source_id, locator from research_observation
       group by source_id, locator having count(*) > 1
     ) t`
  );
  const dupRows = await queryRows(
    `select count(*) as c from (
       select source_id, locator, count(*) from research_observation
       group by source_id, locator having count(*) > 1
     ) t`
  );
  const overProvision = await queryRows(
    `select count(*) as c from research_observation where uncertainty like '%legacy%'`
  );
  console.log("TOTAL_OBS", total[0].c);
  console.log("DUP_LOCATOR_GROUPS", dup[0].c);
  console.log("TOTAL_MENTIONS", (await queryRows(`select count(*) as c from research_mention`))[0].c);
  console.log("LEGACY_UNCERTAINTY_OBS", overProvision[0].c);
}
main().catch((e) => { console.error("ERR", e.message); process.exit(1); });
