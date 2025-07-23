const kakaoTemplateMap = {
  A: {
    templateId: "KA01TP250717092836441cjGZrRGM66z",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "membership_number",
      "reserver_contact",
      "checkin_date",
      "checkout_date",
      "adult",
      "youth",
      "child"
    ]
  },

  C: {
    templateId: "KA01TP250717094743450Wf4kKoUAhxW",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "membership_number",
      "reserver_contact",
      "checkin_date",
      "checkout_date",
      "adult",
      "youth",
      "child",
      "final_price"
    ]
  },

  E: {
    templateId: "KA01TP250717103755493cUguDda3Z52",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "membership_number",
      "reserver_contact",
      "checkin_date",
      "checkout_date",
      "adult",
      "youth",
      "child"
    ]
  },

  F: {
    templateId: "KA01TP250717104028375LQrbkJSCOOA",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "membership_number",
      "reserver_contact",
      "checkin_date",
      "checkout_date",
      "adult",
      "youth",
      "child"
    ]
  },

  G_customer: {
    templateId: "KA01TP2507190814343475ph4kvUnERi",
    variables: [
      "stay_location",
      "reserver_name",
      "arrival_link"
    ]
  },

  G_admin: {
    templateId: "KA01TP250719085943523SM4adUoNUs1",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "membership_number",
      "reserver_contact",
      "checkin_date",
      "checkout_date",
      "adult",
      "youth",
      "child",
      "special_requests",
      "services",
      "admin_notes"
    ]
  },

  H: {
    templateId: "KA01TP250719081039026KFEsvcvVWJH",
    variables: [
      "stay_location",
      "reserver_name",
      "door_code"
    ]
  },

  I: {
    templateId: "KA01TP250717105636121xwIvKPCBm6d",
    variables: [
      "stay_location"
    ]
  },

  J: {
    templateId: "KA01TP2507171050387926rpp6dMtBdR",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "deposit_price",
      "additional_price",
      "settlement_breakdown",
      "settlement_amount"
    ]
  },

  K: {
    templateId: "KA01TP25071710483540776F04GPZ4fI",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id",
      "deposit_price",
      "additional_price",
      "settlement_breakdown",
      "settlement_amount",
      "settlement_url"
    ]
  },

  L: {
    templateId: "KA01TP2507171046370671hRS4xultmJ",
    variables: [
      "stay_location",
      "reserver_name",
      "order_id"
    ]
  }
};


function mapKakaoTemplate(templateType, params) {
  const template = kakaoTemplateMap[templateType];
  if (!template) return null;

  const variableObject = {};
  for (const key of template.variables) {
    variableObject[`#{${key}}`] = String(params[key] ?? "");
  }

  return {
    templateId: template.templateId,
    variables: variableObject,
  };
}

module.exports = mapKakaoTemplate;
