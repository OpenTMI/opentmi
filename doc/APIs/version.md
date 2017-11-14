# Individual document version numbers

Each documents contains `__v` -version property (integer).
It can be used to avoid conflicts when simultaneously updating same document.

Client should always use version number when updating individual documents.
Version number can be attach to update (`PUT`) API's json body
`{__v: <version>}` - only valid version number is same than in database in that time.
When `__v` is defined backend will validates version number before
updating the document. If version number doesn't match but actual document exists backend
will give `409` (conflicts) as status code, body contains most recent document
from DB including current version number. This is clear indicate for clients
that it have to update document (merge changes for example) before updating can success.
