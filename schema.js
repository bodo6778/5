const {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLObjectType,
  GraphQLList,
  GraphQLSchema,
  GraphQLError,
} = require("graphql");
const { books, users, getNextBookId } = require("./db");
const jwt = require("jsonwebtoken");
const { JWT_SECRET, requireUser } = require("./middleware/auth");

const BookType = new GraphQLObjectType({
  name: "Book",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    title: { type: new GraphQLNonNull(GraphQLString) },
    author: { type: new GraphQLNonNull(GraphQLString) },
    year: { type: GraphQLInt },
    summary: {
      type: GraphQLString,
      resolve: (parent) => `${parent.title} by ${parent.author}`,
    },
  },
});

const UserType = new GraphQLObjectType({
  name: "User",
  fields: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    username: { type: new GraphQLNonNull(GraphQLString) },
  },
});

// ----- Querries ----

const QueryType = new GraphQLObjectType({
  name: "Query",
  fields: {
    books: {
      type: new GraphQLList(BookType),
      resolve: () => books,
    },
    book: {
      type: BookType,
      args: { id: { type: new GraphQLNonNull(GraphQLID) } },
      resolve: (parent, args) =>
        books.find((book) => book.id === Number(args.id)),
    },
    me: {
      type: UserType,
      resolve: (parent, args, context) => requireUser(context),
    },
  },
});

// --- Mutations ---

const MutationType = new GraphQLObjectType({
  name: "Mutations",
  fields: {
    login: {
      type: GraphQLString,
      args: {
        username: { type: new GraphQLNonNull(GraphQLString) },
        password: { type: new GraphQLNonNull(GraphQLString) },
      },
      resolve: (_, args) => {
        const user = users.find(
          (user) =>
            user.password === args.password && user.username === args.username,
        );

        if (!user) {
          throw new GraphQLError("Invalid username or password!");
        }

        return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
          expiresIn: "1h",
        });
      },
    },
    createBook: {
      type: BookType,
      args: {
        title: { type: new GraphQLNonNull(GraphQLString) },
        author: { type: new GraphQLNonNull(GraphQLString) },
        year: { type: GraphQLInt },
      },
      resolve: (parent, args, context) => {
        requireUser(context);

        const newBook = {
          id: getNextBookId(),
          title: args.title,
          author: args.author,
          year: args.year,
        };
        books.push(newBook);
        return newBook;
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType,
});
