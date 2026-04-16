const cookieHeader = "customer_session=customer_CST1234_4567; customer_id=CST1234";

const getCustomerIDFromCookie = (cookieHeader) => {
  if (!cookieHeader) return null;

  const customerSession = cookieHeader.match(/customer_session=([^;]+)/)?.[1];
  const customerID = cookieHeader.match(/customer_id=([^;]+)/)?.[1];

  if (!customerSession || !customerID) return null;

  if (!customerSession.startsWith(`customer_${customerID}_`)) return null;

  return customerID;
};

console.log("Result:", getCustomerIDFromCookie(cookieHeader));
