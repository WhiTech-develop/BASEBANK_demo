/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const onCreateDeal = /* GraphQL */ `
  subscription OnCreateDeal($filter: ModelSubscriptionDealFilterInput) {
    onCreateDeal(filter: $filter) {
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
export const onUpdateDeal = /* GraphQL */ `
  subscription OnUpdateDeal($filter: ModelSubscriptionDealFilterInput) {
    onUpdateDeal(filter: $filter) {
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
export const onDeleteDeal = /* GraphQL */ `
  subscription OnDeleteDeal($filter: ModelSubscriptionDealFilterInput) {
    onDeleteDeal(filter: $filter) {
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
export const onCreateItem = /* GraphQL */ `
  subscription OnCreateItem($filter: ModelSubscriptionItemFilterInput) {
    onCreateItem(filter: $filter) {
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
export const onUpdateItem = /* GraphQL */ `
  subscription OnUpdateItem($filter: ModelSubscriptionItemFilterInput) {
    onUpdateItem(filter: $filter) {
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
export const onDeleteItem = /* GraphQL */ `
  subscription OnDeleteItem($filter: ModelSubscriptionItemFilterInput) {
    onDeleteItem(filter: $filter) {
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
export const onCreateMessage = /* GraphQL */ `
  subscription OnCreateMessage($filter: ModelSubscriptionMessageFilterInput) {
    onCreateMessage(filter: $filter) {
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
export const onUpdateMessage = /* GraphQL */ `
  subscription OnUpdateMessage($filter: ModelSubscriptionMessageFilterInput) {
    onUpdateMessage(filter: $filter) {
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
export const onDeleteMessage = /* GraphQL */ `
  subscription OnDeleteMessage($filter: ModelSubscriptionMessageFilterInput) {
    onDeleteMessage(filter: $filter) {
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
