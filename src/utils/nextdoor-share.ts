const NEXTDOOR_BODY_MAX_ENCODED_LENGTH = 3500;

const encodeBodyWithinLimit = (body: string): string => {
  let encodedBody = "";

  for (const character of body.trim()) {
    const encodedCharacter = encodeURIComponent(character);
    if (
      encodedBody.length + encodedCharacter.length >
      NEXTDOOR_BODY_MAX_ENCODED_LENGTH
    ) {
      break;
    }
    encodedBody += encodedCharacter;
  }

  return encodedBody;
};

export const buildNextdoorShareUrl = (body: string): string => {
  const encodedBody = encodeBodyWithinLimit(body);
  return `https://nextdoor.com/sharekit/?source=tandra.me&body=${encodedBody}&hashtag=roofing`;
};
