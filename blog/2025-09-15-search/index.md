# Offline semantic search

Lately I've started examining the problem of offline search for static websites.

Static sites have lots of convenient qualities—namely, the fact that they incur
virtually no hosting costs and cheap hosting at any scale compared to dynamic
sites. In the current state of the art, most static site generators use
`lunr.js` to generate a traditional search index using tried and tested
technology, but with advancements in Language Models, "semantic search" now
exists as a possibility.

I don't have a lot of expertise in the language model space, so I had lots of
questions about this approach. I didn't know if I could get good search results
out of a language model small enough to expect client devices to run in the
browser.

<!-- truncate -->

## Old technologies

Historically, search relied upon a technique called Term Frequency Inverse
Document Frequency. This algorithm computes how well a search query matches a
document by using the Term Frequency—the number or rate of a term occurring in a
document—to weight documents per term in the query, and using the Inverse
Document Frequency to weight terms according to their rarity in the corpus.

With raw Term Frequency, a query like, "the bird" probably assigns the highest
weight to the document with the most occurrences of "the," when the user would
probably like to see a higher weight assigned to the two or three documents
mentioning birds. Inverse Document Frequency accounts for the fact that
virtually every document contains "the" while only a small number of documents
contain the word "bird," and assigns higher weights to "bird" in reflection of
those facts.

## Semantic search

Transformer models encode the semantic meaning of a document in a
high-dimensional vector. The app first tokenizes the document, then initializes
a semantic vector and repeatedly invokes `meaning' = f(meaning, token)` on the
sequence of tokens in the document until it arrives at a vector representing the
meaning of the entire input document. This explanation has much more handwaving
than the explanation of older technologies because while only one algorithm
exists for Term Frequency Inverse Document Frequency, many algorithms exist for
encoding documents as semantic vectors.

Having arrived at a semantic encoding for a unit of text, someone wishing to
make a query can embed their search query using the same model and find the
document whose meaning vector most closely aligns with the vector of their
query by a metric such as cosine similarity.

## Challenges of semantic search

Language models take up a lot of space, as their name implies. Even the smallest
models take megabytes to encode their weights, which means seconds over a
1&nbsp;Gbps connection. Larger models generally produce better encodings and
seem "more intelligent" as a result.

In a server-side context, semantic search involves vector databases and
expensive compute hardware to quickly generate embeddings of queries on state of
the art models and match the nearest neighbors in large document corpora using
an Aproximate kNN index.

For offline semantic search, I have less control over compute resources since
the query gets embedded on a client device a few times per second while the user
types, and the client has to download the model before it can run inferrence for
the first time.

Small models like the "Universal Sentence Encoder" model can run quickly in the
browser using tools like Tensorflow's WebGL backend, but smaller models can't
produce as rich an embedding as their larger counterparts, so encoding an entire
document discards a lot of information. To compensate for this, a semantic
search that uses a smaller model needs to operate on smaller pieces of
documents, such as sections or paragraphs.

## Implementation

The search for this site generates a search index at build time, as with
`lunr.js` and similar plugins, but instead of generating a Term Frequency
Inverse Document Frequency index, this implementation parses the markdown files
and breams them into chunks at semantic boundaries defined by the markdown
syntax. Next, the indexer joins small chunks to produce chunks of a reasonable
size for the Universal Sentence Encoder to embed.

Each chunk gets its own embedding in the search index, which links it back to
the page it corresponds to. At runtime, the browser loads the sentence encoder
model and calculates an embedding of the user's search, then brute-forces Cosine
Similarity to find the chunks that best align with their query and point them to
the page containing that chunk.

## Conclusions

How well does it work? I don't know. Right now, this site only contains this
post and a recipe for brownies. Some things I can say for sure, though. The
brownie recipe doesn't contain the word "chocolate," but if I search for
"chocolate," I find that recipe as the first search result. That doesn't say a
lot since it only competes with the default blog posts and tutorial from the
site template. I'll have to wait and see how well the solution holds up as the
site content grows.
