# Cron API

Cron API allows to automate background tasks, e.g. 
to generate read-only views using mongodb aggregates.


**NOTE** Following API's require authentication token to work.

Data schema available [here](../../app/models/cronjob.js)

Cronjobs support clustering mode as well as multiple instances. 
Job locking is done using mongodb.

## Find Cron jobs
Find Cron jobs. 

*  **URL**

   /api/v0/cron

* **Method**

  `GET`
  
## New Cron jobs

*  **URL**

   /api/v0/cron

* **Method**

  `POST`
  
## View Cron jobs

*  **URL**

   /api/v0/cron/:Job

* **Method**

  `GET`
  
## Example

```
POST /api/v0/cron
payload: 
{
  name: "test",
  type: "view,
  view: {
    col: "results",
    view: "myview",
    pipeline: '[{"$projet": "name"}, {"$limit": 10}]'
  },
  cron: {
    enabled: true,
    cron: "* * * * * *"
  }
}
``` 

This would generate collection `cronjobs.myview` once per 
second using pipeline from `results` -collection:
```
[{"$projet": "name", "_id": 0}, {"$limit": 3}]'
```

To get this view use:
```
GET /api/v0/cron/:id/view

result:
[
   {name": xxx},
   {name": xxx},
   {name": xxx},
]
```