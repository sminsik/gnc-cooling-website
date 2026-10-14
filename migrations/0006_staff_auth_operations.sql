CREATE TABLE staff_bootstrap (
 id TEXT PRIMARY KEY CHECK(id='initial'), staff_id TEXT NOT NULL REFERENCES staff(id), created_at INTEGER NOT NULL
);
CREATE TABLE staff_auth_events (
 id TEXT PRIMARY KEY, staff_id TEXT REFERENCES staff(id),
 event TEXT NOT NULL CHECK(event IN('bootstrap','login','logout','reinvite')),
 at INTEGER NOT NULL
);
CREATE INDEX auth_events_time ON staff_auth_events(at,id);
