# Individual document version numbers

Each documents contains `__v` -version property (integer).
It can be used to avoid conflicts when simultaneously updating same document.

Client should always use version number when updating individual document.
Version number can be attach to update (`PUT`) API's as a query
parameter: `?__v=<version>`. In that case backend will validates version number before
updating. If version number doesn't match but actual document exists backend
will give `409` (conflicts) as status code, body contains most recent document from DB.
This is clear indicate for client that it have to update document
(merge changes for example) before updating can success.
