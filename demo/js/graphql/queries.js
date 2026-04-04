/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getDeal = /* GraphQL */ `
  query GetDeal($id: ID!) {
    getDeal(id: $id) {
      id
      staff_name
      venue_id
      venueLabel
      customer
      status
      total_buy_price
      hqAnswer
      items {
        nextToken
        __typename
      }
      messages {
        nextToken
        __typename
      }
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listDeals = /* GraphQL */ `
  query ListDeals(
    $filter: ModelDealFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listDeals(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        staff_name
        venue_id
        venueLabel
        customer
        status
        total_buy_price
        hqAnswer
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getItem = /* GraphQL */ `
  query GetItem($id: ID!) {
    getItem(id: $id) {
      id
      dealID
      category
      itemName
      weight
      buy_price
      condition
      photos
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listItems = /* GraphQL */ `
  query ListItems(
    $filter: ModelItemFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listItems(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        dealID
        category
        itemName
        weight
        buy_price
        condition
        photos
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const getMessage = /* GraphQL */ `
  query GetMessage($id: ID!) {
    getMessage(id: $id) {
      id
      dealID
      sender_role
      text
      sent_at
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const listMessages = /* GraphQL */ `
  query ListMessages(
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listMessages(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        id
        dealID
        sender_role
        text
        sent_at
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const itemsByDealID = /* GraphQL */ `
  query ItemsByDealID(
    $dealID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelItemFilterInput
    $limit: Int
    $nextToken: String
  ) {
    itemsByDealID(
      dealID: $dealID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        dealID
        category
        itemName
        weight
        buy_price
        condition
        photos
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
export const messagesByDealID = /* GraphQL */ `
  query MessagesByDealID(
    $dealID: ID!
    $sortDirection: ModelSortDirection
    $filter: ModelMessageFilterInput
    $limit: Int
    $nextToken: String
  ) {
    messagesByDealID(
      dealID: $dealID
      sortDirection: $sortDirection
      filter: $filter
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        id
        dealID
        sender_role
        text
        sent_at
        createdAt
        updatedAt
        __typename
      }
      nextToken
      __typename
    }
  }
`;
