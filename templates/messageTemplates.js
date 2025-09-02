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
  },

  C: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 예약 취소 접수`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child, final_price
    }) => `[TERENE ${stay_location}]
${reserver_name}님의 예약 취소가 접수되었습니다.

[예약정보]

1. 예약번호 : ${order_id}
2. 회원번호 : ${membership_number}
3. 이름 : ${reserver_name}
4. 연락처 : ${reserver_contact}
5. 지점 : TERENE ${stay_location}
6. 숙박 일정 : ${checkin_date}~${checkout_date}
7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명 
8. 결제 금액 : ${final_price}원`
  },

  E: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 예약 취소 완료`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child
    }) => `[TERENE ${stay_location}]
${reserver_name}님의 예약이 취소되었습니다.

[예약정보]

1. 예약번호 : ${order_id}
2. 회원번호 : ${membership_number}
3. 이름 : ${reserver_name}
4. 연락처 : ${reserver_contact}
5. 지점 : TERENE ${stay_location}
6. 숙박 일정 : ${checkin_date}~${checkout_date}
7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명 

예약 취소는 접수 이후 재취소가 불가합니다.
환불은 환불규정에 따라 처리되며 평균 3~5영업일 이내에 처리됩니다. 

추가 문의는 카카오톡채널(ID: TERENE)로 부탁드립니다. 감사합니다!`
  },

  F: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 예약 취소 완료`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child
    }) => `[TERENE ${stay_location}]
${reserver_name}님의 예약이 취소 완료되었습니다.

예약정보

1. 예약번호 : ${order_id}
2. 회원번호 : ${membership_number}
3. 이름 : ${reserver_name}
4. 연락처 : ${reserver_contact}
5. 지점 : TERENE ${stay_location}
6. 숙박 일정 : ${checkin_date}~${checkout_date}
7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명

환불 처리는 평균 3~5영업일 이내에 처리됩니다. 

불편을 드려 다시 한번 죄송합니다.`
  },

  G_customer: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 체크인 안내`,

    body: ({ stay_location, reserver_name, arrival_link }) => `[TERENE ${stay_location}]
안녕하세요, ${reserver_name}님
오시는 길과 체크인 시간 안내 드립니다.

테레네 운무 위치 :
강원도 화천군 하남면 호수길 206-31 (원천리 136-40)

네비게이션에 ‘테레네 운무’ 또는 ‘TERENE ${stay_location}’ 검색하셔서 오시면 됩니다.

최근 주변 도로 공사가 많으니 안전 운전하시고, 
‘지촌삼거리’에서는 ‘화천’ 방향(파란색 유도선)으로, 도착 3분 전 갈림길에서는 ‘호수길’ 방향으로 오시면 헤매지 않고 도착하실 수 있습니다.

체크인 시간 : 오후 3시
체크아웃 시간 : 오전 10시 30분

■ 예상 도착시간을 알려주세요
${arrival_link}

출입 비밀번호를 포함한 체크인 정보는 12시에 문자로 전달됩니다. 감사합니다!`
  },

  G_admin: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 체크인 안내 (관리자용)`,

    body: ({
      stay_location, reserver_name, order_id, membership_number, reserver_contact,
      checkin_date, checkout_date, adult, youth, child, special_requests, services, admin_notes
    }) => `[TERENE ${stay_location}]
${reserver_name}님이 체크인하는 날입니다

예약정보

1. 예약번호 : ${order_id}
2. 회원번호 : ${membership_number}
3. 이름 : ${reserver_name}
4. 연락처 : ${reserver_contact}
5. 지점 : TERENE ${stay_location}
6. 숙박 일정 : ${checkin_date}~${checkout_date}
7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명 
8. 요청사항 : ${special_requests}
9. 추가 서비스 : ${services}
10. 특이사항 : ${admin_notes}`
  },

  H: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] ${reserver_name}님 체크인 정보 전달`,

    body: ({ stay_location, reserver_name, door_code }) => `[TERENE ${stay_location}]
${reserver_name}님, 체크인 정보를 전달드립니다.

■ 출입문/라운지 비밀번호 : ${door_code}
■ 체크인 시간 : 오후 3시 정각

*체크인 시간 전에 도착하신 분들은 잠시 라운지에서 기다려주세요. 편안한 소파와 음악, 음료가 준비되어 있습니다 (위치 : 입구 정원을 바라보고 오른쪽 별채)

-주요 이용규칙 안내-

[비대면 운영관련 유의사항]
시설 이용간 이용객의 부주의로 인해 발생한 문제 또는 사고에 대한 모든 책임은 이용객에게 있으며 비대면 운영의 특성 상 발생한 문제에 대해 자체적으로 대처해야 합니다. 

[시설보호의 의무]
시설 이용간 시설의 훼손, 파손, 고장, 분실, 오염, 도난, 사고 등을 방지하기 위해 이용객은 최선을 다해야하며 이용객의 부주의로 인해 발생한 피해에 대하여 추가 비용(손해배상)이 청구될 수 있습니다. 

[퇴실시간 엄수 : 오전 10시 30분]
체크아웃 시간을 넘겨서 퇴실하는 경우 퇴실 당일 숙박요금의 50%의 추가요금이 부과됩니다 (퇴실 시 현장결제)

[퇴실정리]
주방, BBQ 등은 사용 후에 직접 정리하고 일반/플라스틱/유리병/음식물쓰레기는 꼭 분리수거하여야 합니다. 

자세한 시설이용방법과 공간별 비품위치 등은 “이용안내서”를 참고해주세요

■ TERENE UNMU 이용 안내서 링크
<링크> : https://drive.google.com/file/d/1RP5g0gQMKbE5e8WP_nu2lADhyl3Gdy3q/view?usp=drive_link


■ BBQ 숯 점화방법 동영상 링크
https://tv.naver.com/v/70006417

이용 간 불편 및 문의 사항은 카카오톡채널(ID : TERENE) 문의를 통해 부탁드립니다`
  },

  I: {
    title: ({ stay_location }) =>
      `[TERENE ${stay_location}] 체크아웃 안내`,

    body: ({ stay_location }) => `[TERENE ${stay_location}]
아쉽지만 체크아웃 30분 전 안내를 드립니다.
지금부터 라운지는 청소를 위해 이용이 제한됩니다.

다음 고객을 위해 체크아웃시간은 꼭 지켜주세요. 

TERENE ${stay_location}를 방문해주셔서 진심으로 감사드립니다.
이곳에서의 시간이 머문 모두에게 소중한 추억이 되었기를 바랍니다.

감사합니다`
  },

  J: {
    title: ({ stay_location }) =>
      `[TERENE ${stay_location}] 체크아웃 정산 완료`,

    body: ({ stay_location, reserver_name, order_id, deposit_price, additional_price, settlement_breakdown, settlement_amount }) => `[TERENE ${stay_location}]
${reserver_name}님,
예약번호 ${order_id} 체크아웃 정산이 완료되었습니다.

보증금 금액 : ${deposit_price}원
숙박 간 사용 금액 : ${additional_price}원 
${settlement_breakdown}
최종 환불 금액 : ${settlement_amount}원

결제하신 수단으로 평균 3~5영업일 이내에 처리될 예정입니다.

상세 내역 및 문의 사항은 카카오톡 채널 문의를 통해 부탁드립니다.
감사합니다.`
  },

  K: {
    title: ({ stay_location }) =>
      `[TERENE ${stay_location}] 체크아웃 정산 및 추가 결제 안내`,

    body: ({ stay_location, reserver_name, order_id, deposit_price, additional_price, settlement_breakdown, settlement_amount, settlement_url }) => `[TERENE ${stay_location}]
${reserver_name}님, 
예약번호 ${order_id} 체크아웃 정산이 완료되었습니다.

보증금 금액 : ${deposit_price}원
숙박 간 사용 금액 : ${additional_price}원 
${settlement_breakdown}
추가 결제 요청 금액 : ${settlement_amount}원

■아래 링크를 통해 추가 결제를 진행해주시길 바랍니다.
${settlement_url}

상세 내역 및 문의 사항은 카카오톡채널(ID : TERENE)를 통해 부탁드립니다.

감사합니다.`
  },

  L: {
    title: ({ stay_location }) =>
      `[TERENE ${stay_location}] 숙박 건 처리 완료 안내`,

    body: ({ stay_location, reserver_name, order_id }) => `[TERENE ${stay_location}]
${reserver_name}님, 
예약번호 ${order_id} 숙박 건이 처리 완료되었습니다.`
  },

  // M: SMS, Email Exclusive
  M: {
    title: ({ stay_location, reserver_name }) => `[TERENE ${stay_location}] ${reserver_name}님 예상도착시간 안내`,

    body: ({ reserver_name, arrival_timeline }) => `${reserver_name}님의 예상도착시간:
    ${arrival_timeline} 입니다.`
  }
};

module.exports = messageTemplates;
