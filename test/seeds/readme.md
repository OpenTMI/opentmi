Use contents of this folder to fill mongoDB with dummy data using `mongoimport` (for individual collections)
or `dookie` (whole DB).

redo individual collections with Mongoimport:
```
mongoimport --db opentmi_dev --drop --jsonArray --file ./test/seeds/items.json
mongoimport --db opentmi_dev --drop --jsonArray --file ./test/seeds/users.json
mongoimport --db opentmi_dev --drop --jsonArray --file ./test/seeds/loans.json
```

insert or export many collections with dookie:

first make sure its installed (`npm install`)

to export db to file:

`$ node_modules/.bin/dookie pull --db <name_of_db> --file <filename>`

example: `dookie pull --db opentmi_dev --file ./dbdump.json`

to import db from file:

`$ node_modules/.bin/dookie push --db <name_of_db> --file <filename>`

example: `dookie push --db opentmi_dev --file ./test/seeds/dummy_db.json`

Links:
* https://www.npmjs.com/package/dookie
* http://thecodebarbarian.com/dookie-import-export-mongodb
