const messageTemplates = {
  A: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location} | Reservation Confirmation & Pre-Arrival Information Request]`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child, final_price
    }) => `Dear ${reserver_name},
Thank you for choosing TERENE ${stay_location}.
We are pleased to inform you that your reservation has been provisionally confirmed.

If you provide a scanned copy or image of your passport in advance,
we can expedite your check-in process.
Your personal information will be securely handled in accordance with our privacy policy.

Reservation Details

1. Reservation No. : ${order_id}
2. Membership No. : ${membership_number}
3. Name : ${reserver_name}
4. Phone Number : ${reserver_contact}
5. Accomodation : TERENE ${stay_location}
6. Stay Period : ${checkin_date}~${checkout_date}
7. Number of Guests : ${adult} Adults, ${youth} Youth, ${child} Infants
8. Total Amount : ${final_price.toLocaleString()}

Your reservation details can be checked at any time on the TERENE website under Reservation → ‘Check Guest Reservation’


We will send you informational messages one week and one day before your check-in date for your convenience, as detailed below.
 · One Week Prior to Check-In: Arrival instructions and check-in time details
 · One Day Prior to Check-In: Door access code and accommodation information

If you have any questions, please contact us via the TERENE KakaoTalk Channel (ID: terene_official), Instagram DM (@terene_official), or email (reserve@terene.kr)
If you need assistance at any time, our team will be delighted to help.

Once again, thank you for choosing TERENE UNMU.
We look forward to your arrival and wish you a delightful stay.

Thank you,
TERENE ${stay_location} Team`
  },

//   C: {
//     title: ({ stay_location, reserver_name }) =>
//       `[TERENE ${stay_location}] ${reserver_name}님 예약 취소 접수`,

//     body: ({
//       stay_location, reserver_name, order_id, membership_number,
//       reserver_contact, checkin_date, checkout_date, adult, youth, child, final_price
//     }) => `[TERENE ${stay_location}]
// ${reserver_name}님의 예약 취소가 접수되었습니다.

// [예약정보]

// 1. 예약번호 : ${order_id}
// 2. 회원번호 : ${membership_number}
// 3. 이름 : ${reserver_name}
// 4. 연락처 : ${reserver_contact}
// 5. 지점 : TERENE ${stay_location}
// 6. 숙박 일정 : ${checkin_date}~${checkout_date}
// 7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명 
// 8. 결제 금액 : ${final_price}원`
//   },

  E: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location}] | Reservation Cancellation Notice`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child, final_price
    }) => `Dear ${reserver_name},
We would like to inform you that your reservation has been cancelled.

Reservation Details

1. Reservation No. : ${order_id}
2. Membership No. : ${membership_number}
3. Name : ${reserver_name}
4. Phone Number : ${reserver_contact}
5. Accomodation : TERENE ${stay_location}
6. Stay Period : ${checkin_date}~${checkout_date}
7. Number of Guests : ${adult} Adults, ${youth} Youth, ${child} Infants
8. Total Amount : ${final_price.toLocaleString()}

Once a cancellation request has been submitted, it cannot be withdrawn.
Refunds will be handled in accordance with our policy and are usually completed within 3–5 business days.


If you canceled by mistake or have any questions, please contact us via the TERENE KakaoTalk Channel (ID: terene_official), Instagram DM (@terene_official), or email (reserve@terene.kr)
Our team will be happy to assist you promptly.

We look forward to welcoming you back to TERENE.

Thank you,
TERENE ${stay_location} Team`
  },

  F: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location} | Reservation Cancellation Notice]`,

    body: ({
      stay_location, reserver_name, order_id, membership_number,
      reserver_contact, checkin_date, checkout_date, adult, youth, child
    }) => `Dear ${reserver_name},
We would like to inform you that your reservation has been cancelled.

Reservation Details

1. Reservation No. : ${order_id}
2. Membership No. : ${membership_number}
3. Name : ${reserver_name}
4. Phone Number : ${reserver_contact}
5. Accomodation : TERENE ${stay_location}
6. Stay Period : ${checkin_date}~${checkout_date}
7. Number of Guests : ${adult} Adults, ${youth} Youth, ${child} Infants
8. Total Amount : ${final_price.toLocaleString()}

Refunds will be handled in accordance with our policy and are usually completed within 3–5 business days.
Please accept our sincere apologies for the inconvenience caused.
We appreciate your kind understanding, and we would like to thank you once again for your interest in TERENE.

We look forward to the pleasure of welcoming you again in the near future.

Thank you,
TERENE ${stay_location} Team`
  },

  G_customer: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location} | Directions & Check-In Information]`,

    body: ({ stay_location, reserver_name, arrival_link }) => `Dear ${reserver_name},
We are pleased to provide you with directions to TERENE UNMU and information regarding your check-in.

-Address
206-31 Hosu-gil, Hanam-myeon, Hwacheon-gun, Gangwon-do
(136-40 Woncheon-ri, Hanam-myeon)
강원도 화천군 하남면 호수길 206-31 (원천리 136-40)

For the most accurate directions, please search for ‘TERENE ${stay_location}’ in your navigation system

■ Check-In: 3:30 PM
■ Check-Out: 11:00 AM

Your door access code and detailed information about the accommodation will be sent emailed to you at 8:00 AM on the day of your check-in.

Thank you, and we look forward to welcoming you soon.
TERENE ${stay_location} Team`
  },

//   G_admin: {
//     title: ({ stay_location, reserver_name }) =>
//       `[TERENE ${stay_location}] ${reserver_name}님 체크인 안내 (관리자용)`,

//     body: ({
//       stay_location, reserver_name, order_id, membership_number, reserver_contact,
//       checkin_date, checkout_date, adult, youth, child, special_requests, services, admin_notes
//     }) => `[TERENE ${stay_location}]
// ${reserver_name}님이 체크인하는 날입니다

// 예약정보

// 1. 예약번호 : ${order_id}
// 2. 회원번호 : ${membership_number}
// 3. 이름 : ${reserver_name}
// 4. 연락처 : ${reserver_contact}
// 5. 지점 : TERENE ${stay_location}
// 6. 숙박 일정 : ${checkin_date}~${checkout_date}
// 7. 숙박 인원 : 성인 ${adult}명, 청소년/아동 ${youth}명, 영유아 ${child}명 
// 8. 요청사항 : ${special_requests}
// 9. 추가 서비스 : ${services}
// 10. 특이사항 : ${admin_notes}`
//   },

  H: {
    title: ({ stay_location, reserver_name }) =>
      `[TERENE ${stay_location} | Detailed Check-In Information & Accommodation Guide]`,

    body: ({ stay_location, reserver_name, door_code }) => `Dear ${reserver_name},
We are pleased to share your check-in information for TERENE ${stay_location}.

■ Door and Lounge Access Code: The last four digits of your mobile number
■ If you arrive before the check-in time,

If you arrive before the check-in time,
you may wait in the lounge located in the annex on the right side of the entrance garden.
The lounge offers a relaxing atmosphere with sofas, music, and beverages.

-Important Information for Your Stay

[Self-Service Operation]
As TERENE ${stay_location} operates without on-site staff, guests are responsible for the use and care of the facilities during their stay.
TERENE assumes no responsibility for any issues or accidents resulting from guest negligence.

[Property Use & Care]
Please take care to prevent any damage, contamination, loss, or theft of the property and its facilities.
Additional charges may apply for any damages or losses resulting from guest negligence.

[Check-Out Time: 11 AM (Strictly Enforced)]
A surcharge equivalent to 50% of the room rate will be charged on-site for check-outs made after the designated time.


[Before Check-Out]

Please clean the kitchen and BBQ area after use, and dispose of waste by separating it into general, plastic, glass, and food items.


For detailed instructions and information, please refer to the link below.

■ Guest Guid for TERENE UNMU: [Link]
https://drive.google.com/file/d/1RP5g0gQMKbE5e8WP_nu2lADhyl3Gdy3q/view?usp=drive_link

■ BBQ Charcoal Lighting Guide (Video):
https://tv.naver.com/v/70006417

If you canceled by mistake or have any questions, please contact us via the TERENE KakaoTalk Channel (ID: terene_official), Instagram DM (@terene_official), or email (reserve@terene.kr)
We wish you a pleasant and comfortable stay.
Thank you,
TERENE ${stay_location} Team`
  },

  I: {
    title: ({ stay_location }) =>
      `[TERENE ${stay_location} | Check-out Information]`,

    body: ({ stay_location, reserver_name }) => `Dear ${reserver_name},
We would like to inform you that your check-out time is in 30 minutes.

The lounge is temporarily closed for cleaning.
To ensure a smooth experience for the next guests, please check out by the designated time.

We sincerely appreciate the time you spent with us at TERENE ${stay_location}.


May this stay become a meaningful chapter in your journey, filled with lasting memories.


Thank you,
TERENE ${stay_location} Team`
  },

  J: {
    title: ({ stay_location, order_id }) =>
      `[TERENE ${stay_location} | Check-Out Receipt (Reservation #${order_id})]`,

    body: ({ stay_location, reserver_name, order_id, final_price, deposit_price, additional_price, settlement_breakdown, settlement_amount }) => `Dear ${reserver_name},
We are pleased to inform you that the final invoice for your stay (Reservation No. ${order_id}) has been issued.

Payment Amount: KRW ${settlement_amount.toLocaleString()}
Security Deposit: KRW ${deposit_price.toLocaleString()}
Charges Incurred During Stay: KRW ${additional_price.toLocaleString()}
${settlement_breakdown}

Final Refund Amount: ₩${settlement_amount}

Refunds will be processed to the original payment method within 3–5 business days.
For further inquiries, please contact us via the TERENE KakaoTalk Channel (ID: terene_official), Instagram DM (@terene_official), or email (reserve@terene.kr)

Thank you for staying with us at TERENE ${stay_location}.
We look forward to welcoming you again.

Thank you,
TERENE ${stay_location} Team`
  },

  K: {
    title: ({ stay_location }) =>
      `[TERENE ${stay_location} | Check-Out Billing & Additional Payment Request (Reservation #${order_id})]`,

    body: ({ stay_location, reserver_name, order_id, deposit_price, additional_price, settlement_breakdown, settlement_amount, settlement_url }) => `Dear ${reserver_name},
We would like to inform you that the billing for your stay (Reservation No. ${order_id}) has been finalized, and an additional payment has been incurred.

Security Deposit: KRW ${deposit_price.toLocaleString()}
Charges Incurred During Stay: KRW ${additional_price.toLocaleString()}
${settlement_breakdown}

Additional Payment Due: KRW ${settlement_amount.toLocaleString()}

Please proceed with the additional payment using the link below:
${settlement_url}

For further inquiries regarding your stay, please contact us via the TERENE KakaoTalk Channel (ID: terene_official), Instagram DM (@terene_official), or email (reserve@terene.kr)

Thank you for choosing TERENE ${stay_location}, and we sincerely look forward to your next visit.

Thank you,
TERENE ${stay_location} Team`
  },

//   L: {
//     title: ({ stay_location }) =>
//       `[TERENE ${stay_location}] 숙박 건 처리 완료 안내`,

//     body: ({ stay_location, reserver_name, order_id }) => `[TERENE ${stay_location}]
// ${reserver_name}님, 
// 예약번호 ${order_id} 숙박 건이 처리 완료되었습니다.`
//   },

  // M: SMS, Email Exclusive
  // M: {
  //   title: ({ stay_location, reserver_name }) => `[TERENE ${stay_location}] ${reserver_name}님 예상도착시간 안내`,

  //   body: ({ reserver_name, arrival_timeline }) => `${reserver_name}님의 예상도착시간:
  //   ${arrival_timeline} 입니다.`
  // },

//   N: {
//     title: ({ stay_location, reserver_name }) =>
//       `[TERENE ${stay_location}] ${reserver_name}님 예약 생성 안내`,

//     body: ({ stay_location, reserver_name, order_id, membership_number,
//       reserver_contact, checkin_date, checkout_date }) => `[TERENE ${stay_location}]
// ${reserver_name}님의 예약이 생성되었습니다.

// 예약정보

// 1. 예약번호 : ${order_id}
// 2. 회원번호 : ${membership_number}
// 3. 이름 : ${reserver_name}
// 4. 연락처 : ${reserver_contact}
// 5. 지점 : TERENE ${stay_location}
// 6. 숙박 일정 : ${checkin_date}~${checkout_date}

// 홈페이지에서 예약 조회 후  "예약대기" 인 해당 예약 건에 대하여 "예약하기" 버튼을 클릭하신 후 숙박정보 입력 및 결제를 바로 진행하실 수 있습니다. 

// 2일 이내에 예약이 확정되지 않을 경우 예약대기가 취소될 수 있음을 알려드립니다.`
//   },

//   O: {
//     title: ({ stay_location, reserver_name }) =>
//       `[TERENE ${stay_location}] ${reserver_name}님 예약 변경 안내`,
    
//     body: ({ name }) => `알림톡 도착

// 안녕하세요, ${name}님

// TERENE 회원권 구매 상담 신청을 해주셔서 진심으로 감사드립니다.

// ${name}님께서 신청해주신 회원권 구매 상담은 대면 미팅으로 진행하고 있습니다. 
// 상담 일정 및 장소를 확정하기 위해 담당자가 빠른 시일내에 전화연락을 드릴 수 있도록 하겠습니다.
 
// 업무상 전화 통화가 어려우시거나 빠른 일정 확정이 필요하신 분은 아래 채팅창을 통해 말씀해주세요. 바로 채팅 상담으로 진행 도와드리겠습니다.

// 감사합니다!`
//   },
};

module.exports = messageTemplates;
