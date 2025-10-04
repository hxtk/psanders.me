# Developer experience for SQL queries

I don't like ORMs much. I've worked professionally for a few years with
Hibernate, and I've tried SQLAlchemy on personal projects in the past, and I've
never really liked it because I just don't find it all that hard to write SQL.
Besides that, ORMs offer drawbacks because the way that they "just work" that
save a little time initially, but make things harder to understand when you go
to optimize or debug your code. ORMs often make it difficult for a developer to
tell when a getter on their object will take a few nanoseconds to indirect
memory that the CPU already has in L3 cache, and when it will take a few
milliseconds to make a query to the database.

I've looked at OpenTelemetry traces for simple operations and seen Hibernate
generate dozens of transactions to the database. Using the `@Transactional`
annotation at too high a level also forces the service into demanding a large
number of database connections for concurrency because handlers hold on to
transactions far longer than they need to. It prevents developers from reasoning
easily about how long the transaction actually needs to live.

I see the other side, though. Most frameworks don't provide a great developer
experience for writing raw SQL, either, and in a lot of cases writing code using
an object-relational mapping framework really does make the business logic
easier to understand compared to building dynamic SQL queries by with string
builders, which reviewers then have to audit to make sure you only ever
concatenate a string you can trust to contain safe SQL with any runtime data
bound properly using parameters.

I made [`sqlt`](https://github.com/hxtk/sqlt) to solve that problem in alignment
with my own opinions about writing SQL, so that writing readable SQL doesn't
take more effort than using an Object Relational Mapping.

<!-- truncate -->

## Write SQL in SQL files

Noodling through this problem, I found inspiration in two places:
[`sqlc`](https://sqlc.dev/) and [`tqla`](https://github.com/VauntDev/tqla).

I loved the developer experience of `sqlc`: if you wrote SQL, you wrote it in a
SQL file. Even the least featureful code editors could identify the contents as
SQL and provide useful syntax highlighting and formatting helpers. Through the
`CODEOWNERS` file, the repository would also know when you wrote SQL and require
you to get a review from others on the team with expertise in SQL. This became
one of my requirements:

> Developers should write SQL in SQL files.

Now for the problems. I found it somewhat inflexible. Oftentimes I would want to
write dynamic queries. Sometimes I could get the flexibility I needed with lots
of `CASE` statements and `COALESCE`s to let me update only the fields I wished
to update which I might only know at runtime, or the like. These pain points
didn't drive me away from the solution, but I decided I wanted it in any
alternative I would consider:

> Support conditionally including or excluding parts of a query.

This lack of flexibility really became a problem with sorting and filtering. I
prefer to write web services using gRPC or ConnectRPC as the framework, and I
follow a lot of the guidance in Google's "API Improvement Proposals." Namely,
[AIP-160](https://google.aip.dev/160) talks about having a unified filter
language to allow users to search through your list of resources. I liked that
idea conceptually and wanted to use it. I tried writing custom `sqlc` plugins to
support these dynamic extensions, but it introduced a large volume of code to
maintain and introduced some "magic" that I didn't like-effects that could
potentially happen without the author's attention.

## Support dynamic queries

`tqla` provided better flexibility at the cost of some other features by
allowing developers to write query *templates*, using Go's
[`text/template`](https://pkg.go.dev/text/template) templating language from the
standard library. The query builder automatically took care of escaping any
variables substituted in, turning them into query parameters. I loved the
concept right away, but I didn't like a few things about the API. It always
compiles templates from strings, which makes it easier to inline the SQL than to
write it in a separate file, and it recompiles the template every time you
execute it, which gets computationally costly. Finally, I still found its
flexibility limiting: it could handle conditional blocks it could escape
interpolated variables, but it couldn't integrate with other query fragment
builders you might have that you already trusted to emit safe SQL. Integrating
my filter library remained a problem. This added to the list of things I wanted
out of a general-purpose SQL query builder:

> Integrate with outside safe query fragment builders.

## Combining my favorite parts

Combining my favorite parts of `sqlc` and `tqla` didn't take a lot of work. I
just needed to change the external API for `tqla`'s template to match the
external API for the standard library `text/template` library: namely,
`ParseFS`, which would allow me to `go:embed` a directory of SQL files and
reference those files as query builders.

-   [x] Developers should write SQL in SQL files.
-   [x] Support conditionally including or excluding parts of a query.
-   [ ] Integrate with outside safe query fragment builders.

I still had one box left to tick, and for that I created the `Sanitizer`
interface: a user of `sqlt` can supply their own
[`Sanitizer`](https://pkg.go.dev/github.com/hxtk/sqlt#Sanitizer) to the
template, and it can emit a safe SQL string that gets directly interpolated into
the query and a map of Named Parameters to bind when executing the query.

Now, integrating an AIP-160 filter looks like this:

```go

type AIP160Sanitizer struct {
  args pgx.NamedArgs
}

func (a *AIP160Sanitizer) Args() pgx.NamedArgs {
  return a.args
}

func (a *AIP160Sanitizer) Format(filter any) string {
  query, args := filter.(*filter.Filter).WhereClause()
  a.args = args

  return query
}

templ, _ := sqlt.New("").ParseFS(fs)
templ.Sanitizers(sqlt.SanitizerMap{
    "aip160": func() sqlt.Sanitizer { return new(AIP160Sanitizer) },
})
```

This checked the last of my boxes, but I see room for improvement. For example,
what happens if generating the `WHERE` clause can fail? I think the interface
needs some work and I'll continue to iterate on it as I run into problems, but
for now this has become my favorite way to write SQL queries in Go.
