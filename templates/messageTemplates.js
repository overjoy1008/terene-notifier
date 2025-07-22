const messageTemplates = {
  A: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 예약 확정`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child
    }) => `[TERENE ${stay_location}]
${reserver_name}님의 예약이 확정되었습니다.

예약정보

1. 예약번호 : ${order_id}
2. 회원번호 : ${membership_number}
3. 이름 : ${reserver_name}
4. 연락처 : ${reserver_contact}
5. 지점 : TERENE ${stay_location}
6. 숙박 일정 : ${checkin_date}~${checkout_date}
7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명

상세 예약 내용은 홈페이지 > 예약하기 > 예약 조회하기 에서 확인하실 수 있습니다.
체크인 당일 오전 안내 문자가 발송될 예정입니다.
감사합니다.`
  }
};

module.exports = messageTemplates;
