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

  // 향후 B, C, D 템플릿 등록 가능
};

function mapKakaoTemplate(templateType, params) {
  const template = kakaoTemplateMap[templateType];
  if (!template) return null;

  const variableObject = {};
  for (const key of template.variables) {
    variableObject[`#{${key}}`] = params[key] ?? "";
  }

  return {
    templateId: template.templateId,
    variables: variableObject,
  };
}

module.exports = mapKakaoTemplate;
