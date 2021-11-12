/* eslint-disable react/display-name, react/prop-types */
import React from "react";
import { render, screen } from "@testing-library/react";
import {
  SAMPLE_DATASET,
  MULTI_SCHEMA_DATABASE,
  ORDERS,
  PRODUCTS,
  PEOPLE,
  metadata,
} from "__support__/sample_dataset_fixture";
import Question from "metabase-lib/lib/Question";
import * as Urls from "metabase/lib/urls";
import QuestionDataSource from "./QuestionDataSource";

const BASE_GUI_QUESTION = {
  display: "table",
  visualization_settings: {},
  dataset_query: {
    type: "query",
    database: SAMPLE_DATASET.id,
    query: {
      "source-table": ORDERS.id,
    },
  },
};

const BASE_NATIVE_QUESTION = {
  display: "table",
  visualization_settings: {},
  dataset_query: {
    type: "native",
    database: SAMPLE_DATASET.id,
    native: {
      query: "select * from orders",
    },
  },
};

const SAVED_QUESTION = {
  id: 1,
  name: "Q1",
  description: null,
  collection_id: null,
};

const QUERY_IN_MULTI_SCHEMA_DB = {
  type: "query",
  database: MULTI_SCHEMA_DATABASE.id,
  query: {
    "source-table": MULTI_SCHEMA_DATABASE.tables[0].id,
  },
};

// Joins

const ORDERS_PRODUCT_JOIN_CONDITION = [
  "=",
  ["field", ORDERS.PRODUCT_ID.id, null],
  ["field", PRODUCTS.ID.id, { "join-alias": "Products" }],
];

const ORDERS_PEOPLE_JOIN_CONDITION = [
  "=",
  ["field", ORDERS.USER_ID.id, null],
  ["field", PEOPLE.ID.id, { "join-alias": "People" }],
];

const PRODUCTS_JOIN = {
  alias: "Products",
  condition: ORDERS_PRODUCT_JOIN_CONDITION,
  "source-table": PRODUCTS.id,
};

const PEOPLE_JOIN = {
  alias: "People",
  condition: ORDERS_PEOPLE_JOIN_CONDITION,
  "source-table": PEOPLE.id,
};

const QUERY_WITH_PRODUCTS_JOIN = {
  type: "query",
  database: SAMPLE_DATASET.id,
  query: {
    "source-table": ORDERS.id,
    joins: [PRODUCTS_JOIN],
  },
};

const QUERY_WITH_PRODUCTS_PEOPLE_JOIN = {
  type: "query",
  database: SAMPLE_DATASET.id,
  query: {
    "source-table": ORDERS.id,
    joins: [PRODUCTS_JOIN, PEOPLE_JOIN],
  },
};

// Filters

const RANDOM_ORDER_ID = 155;
const ORDERS_PK_FILTER = ["=", ["field", ORDERS.ID.id, null], RANDOM_ORDER_ID];

const ORDER_DETAIL_QUERY = {
  type: "query",
  database: SAMPLE_DATASET.id,
  query: {
    "source-table": ORDERS.id,
    filter: ["and", ORDERS_PK_FILTER],
  },
};

// Factories

function getQuestion(card) {
  return new Question(card, metadata);
}

function getAdHocQuestion(overrides) {
  return getQuestion({ ...BASE_GUI_QUESTION, ...overrides });
}

function getNativeQuestion() {
  return getQuestion(BASE_NATIVE_QUESTION);
}

function getSavedGUIQuestion(overrides) {
  return getQuestion({ ...BASE_GUI_QUESTION, ...SAVED_QUESTION, ...overrides });
}

function getSavedNativeQuestion(overrides) {
  return getQuestion({
    ...BASE_NATIVE_QUESTION,
    ...SAVED_QUESTION,
    ...overrides,
  });
}

class ErrorBoundary extends React.Component {
  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.props.children;
  }
}

function setup({ question, subHead = false, isObjectDetail = false } = {}) {
  const onError = jest.fn();
  render(
    <ErrorBoundary onError={onError}>
      <QuestionDataSource
        question={question}
        subHead={subHead}
        isObjectDetail={isObjectDetail}
      />
    </ErrorBoundary>,
  );
  return { onError };
}

jest.mock("metabase/components/Link", () => ({ to: href, ...props }) => (
  <a href={href} {...props} />
));

describe("QuestionDataSource", () => {
  const GUI_TEST_CASE = {
    SAVED_GUI_QUESTION: {
      question: getSavedGUIQuestion(),
      questionType: "saved GUI question",
    },
    AD_HOC_QUESTION: {
      question: getAdHocQuestion(),
      questionType: "ad-hoc GUI question",
    },
    SAVED_GUI_PRODUCTS_JOIN: {
      question: getSavedGUIQuestion({
        dataset_query: QUERY_WITH_PRODUCTS_JOIN,
      }),
      questionType: "saved GUI question joining a table",
    },
    AD_HOC_PRODUCTS_JOIN: {
      question: getAdHocQuestion({ dataset_query: QUERY_WITH_PRODUCTS_JOIN }),
      questionType: "ad-hoc GUI question joining a table",
    },
    SAVED_GUI_PRODUCTS_PEOPLE_JOIN: {
      question: getSavedGUIQuestion({
        dataset_query: QUERY_WITH_PRODUCTS_PEOPLE_JOIN,
      }),
      questionType: "saved GUI question joining a few tables",
    },
    AD_HOC_PRODUCTS_PEOPLE_JOIN: {
      question: getAdHocQuestion({
        dataset_query: QUERY_WITH_PRODUCTS_PEOPLE_JOIN,
      }),
      questionType: "ad-hoc GUI question joining a few tables",
    },
    SAVED_GUI_MULTI_SCHEMA_DB: {
      question: getSavedGUIQuestion({
        dataset_query: QUERY_IN_MULTI_SCHEMA_DB,
      }),
      questionType: "saved GUI question using multi-schema DB",
    },
    AD_HOC_MULTI_SCHEMA_DB: {
      question: getAdHocQuestion({ dataset_query: QUERY_IN_MULTI_SCHEMA_DB }),
      questionType: "ad-hoc GUI question using multi-schema DB",
    },
    SAVED_OBJECT_DETAIL: {
      question: getSavedGUIQuestion({ dataset_query: ORDER_DETAIL_QUERY }),
      questionType: "saved object detail",
    },
    AD_HOC_OBJECT_DETAIL: {
      question: getAdHocQuestion({ dataset_query: ORDER_DETAIL_QUERY }),
      questionType: "ad-hoc object detail",
    },
  };

  const GUI_TEST_CASES = Object.values(GUI_TEST_CASE);
  const ALL_TEST_CASES = [
    ...GUI_TEST_CASES,
    {
      question: getNativeQuestion(),
      questionType: "not saved native question",
    },
    {
      question: getSavedNativeQuestion(),
      questionType: "saved native question",
    },
  ];

  it("does not fail if question is not passed", () => {
    const { onError } = setup({ question: undefined });
    expect(onError).not.toHaveBeenCalled();
  });

  describe("common", () => {
    ALL_TEST_CASES.forEach(testCase => {
      const { question, questionType } = testCase;

      describe(questionType, () => {
        it("displays database name", () => {
          setup({ question });
          const node = screen.queryByText(question.database().displayName());
          expect(node).toBeInTheDocument();
          expect(node.closest("a")).toHaveAttribute(
            "href",
            Urls.browseDatabase(question.database()),
          );
        });
      });
    });
  });

  describe("GUI", () => {
    Object.values(GUI_TEST_CASE).forEach(testCase => {
      const { question, questionType } = testCase;

      describe(questionType, () => {
        it("displays table name", () => {
          setup({ question });
          const node = screen.queryByText(
            new RegExp(question.table().displayName()),
          );
          expect(node).toBeInTheDocument();
          expect(node.closest("a")).not.toBeInTheDocument();
        });

        it("displays table link in subhead variant", () => {
          setup({ question, subHead: true });
          const node = screen.queryByText(
            new RegExp(question.table().displayName()),
          );
          expect(node.closest("a")).toHaveAttribute(
            "href",
            question
              .table()
              .newQuestion()
              .getUrl(),
          );
        });

        it("displays table link in object detail view", () => {
          setup({ question, isObjectDetail: true });
          const node = screen.queryByText(
            new RegExp(question.table().displayName()),
          );
          expect(node.closest("a")).toHaveAttribute(
            "href",
            question
              .table()
              .newQuestion()
              .getUrl(),
          );
        });
      });
    });
  });

  describe("GUI with schema", () => {
    [
      GUI_TEST_CASE.SAVED_GUI_MULTI_SCHEMA_DB,
      GUI_TEST_CASE.AD_HOC_MULTI_SCHEMA_DB,
    ].forEach(testCase => {
      const { question, questionType } = testCase;

      describe(questionType, () => {
        it("displays schema name", () => {
          setup({ question });
          const node = screen.queryByText(question.table().schema_name);
          expect(node).toBeInTheDocument();
          expect(node.closest("a")).toHaveAttribute(
            "href",
            Urls.browseSchema(question.table()),
          );
        });
      });
    });
  });

  describe("GUI with joins", () => {
    [
      GUI_TEST_CASE.SAVED_GUI_PRODUCTS_JOIN,
      GUI_TEST_CASE.AD_HOC_PRODUCTS_JOIN,
    ].forEach(testCase => {
      const { question, questionType } = testCase;

      describe(questionType, () => {
        it("displays 2 joined tables", () => {
          setup({ question });
          expect(screen.queryByText(/Orders/)).toBeInTheDocument();
          expect(screen.queryByText(/Products/)).toBeInTheDocument();
        });
      });
    });

    [
      GUI_TEST_CASE.SAVED_GUI_PRODUCTS_PEOPLE_JOIN,
      GUI_TEST_CASE.AD_HOC_PRODUCTS_PEOPLE_JOIN,
    ].forEach(testCase => {
      const { question, questionType } = testCase;

      describe(questionType, () => {
        it("displays > 2 joined tables", () => {
          setup({ question });
          expect(screen.queryByText(/Orders/)).toBeInTheDocument();
          expect(screen.queryByText(/Products/)).toBeInTheDocument();
          expect(screen.queryByText(/People/)).toBeInTheDocument();
        });
      });
    });
  });

  describe("Object Detail", () => {
    [
      GUI_TEST_CASE.SAVED_OBJECT_DETAIL,
      GUI_TEST_CASE.AD_HOC_OBJECT_DETAIL,
    ].forEach(testCase => {
      const { question, questionType } = testCase;

      describe(questionType, () => {
        it("displays object PK in object detail mode", () => {
          setup({ question, isObjectDetail: true });
          expect(
            screen.queryByText(String(RANDOM_ORDER_ID)),
          ).toBeInTheDocument();
        });
      });
    });
  });
});
