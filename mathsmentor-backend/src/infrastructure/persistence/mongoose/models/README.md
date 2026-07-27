# models — scaffolded, no schemas yet

Mongoose schemas are added one collection at a time, starting with `User`
in Phase 4 (Authentication), following the field/index/validation contract
already frozen in DOMAIN_MODEL.md. Models are an implementation detail of
this folder only — never imported outside infrastructure/persistence/mongoose/.
