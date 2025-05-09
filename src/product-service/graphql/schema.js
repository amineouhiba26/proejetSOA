const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    stock: Int!
    createdAt: String!
  }

  type Query {
    products: [Product!]!
    product(id: ID!): Product
  }

  type Mutation {
    createProduct(name: String!, description: String!, price: Float!, stock: Int!): Product
    updateProduct(id: ID!, name: String, description: String, price: Float, stock: Int): Product
    deleteProduct(id: ID!): Boolean
  }
`;

module.exports = typeDefs;