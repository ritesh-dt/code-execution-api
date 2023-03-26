function encode(str) {
    return Buffer.from(str).toString("base64");
    // return btoa(unescape(encodeURIComponent(str || "")));
}

function decode(bytes) {
    return Buffer.from(bytes, "base64").toString();
    // var escaped = escape(atob(bytes || ""));
    // try {
    //     return decodeURIComponent(escaped);
    // } catch {
    //     return unescape(escaped);
    // }
}

module.exports = {
    encode: encode,
    decode: decode
};
