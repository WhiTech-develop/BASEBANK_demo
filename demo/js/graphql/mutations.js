/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createDeal = /* GraphQL */ `
  mutation CreateDeal(
    $input: CreateDealInput!
    $condition: ModelDealConditionInput
  ) {
    createDeal(input: $input, condition: $condition) {
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
export const updateDeal = /* GraphQL */ `
  mutation UpdateDeal(
    $input: UpdateDealInput!
    $condition: ModelDealConditionInput
  ) {
    updateDeal(input: $input, condition: $condition) {
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
export const deleteDeal = /* GraphQL */ `
  mutation DeleteDeal(
    $input: DeleteDealInput!
    $condition: ModelDealConditionInput
  ) {
    deleteDeal(input: $input, condition: $condition) {
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
export const createItem = /* GraphQL */ `
  mutation CreateItem(
    $input: CreateItemInput!
    $condition: ModelItemConditionInput
  ) {
    createItem(input: $input, condition: $condition) {
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
export const updateItem = /* GraphQL */ `
  mutation UpdateItem(
    $input: UpdateItemInput!
    $condition: ModelItemConditionInput
  ) {
    updateItem(input: $input, condition: $condition) {
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
export const deleteItem = /* GraphQL */ `
  mutation DeleteItem(
    $input: DeleteItemInput!
    $condition: ModelItemConditionInput
  ) {
    deleteItem(input: $input, condition: $condition) {
      id
      dealID
      category
      itemName
      weight
      buy_price
      condition
      createdAt
      updatedAt
      __typename
    }
  }
`;
export const createMessage = /* GraphQL */ `
  mutation CreateMessage(
    $input: CreateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    createMessage(input: $input, condition: $condition) {
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
export const updateMessage = /* GraphQL */ `
  mutation UpdateMessage(
    $input: UpdateMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    updateMessage(input: $input, condition: $condition) {
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
export const deleteMessage = /* GraphQL */ `
  mutation DeleteMessage(
    $input: DeleteMessageInput!
    $condition: ModelMessageConditionInput
  ) {
    deleteMessage(input: $input, condition: $condition) {
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
