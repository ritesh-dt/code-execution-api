// (function () {
//     var objGlobal = this;
//     console.log(this, this.escape);
//     if (!(objGlobal.escape && objGlobal.unescape)) {
//         var escapeHash = {
//             _: function (input) {
//                 var ret = escapeHash[input];
//                 if (!ret) {
//                     if (input.length - 1) {
//                         ret = String.fromCharCode(input.substring(input.length - 3 ? 2 : 1));
//                     }
//                     else {
//                         var code = input.charCodeAt(0);
//                         ret = code < 256
//                             ? "%" + (0 + code.toString(16)).slice(-2).toUpperCase()
//                             : "%u" + ("000" + code.toString(16)).slice(-4).toUpperCase();
//                     }
//                     escapeHash[ret] = input;
//                     escapeHash[input] = ret;
//                 }
//                 return ret;
//             }
//         };
//         objGlobal.escape = objGlobal.escape || function (str) {
//             return str.replace(/[^\w @\*\-\+\.\/]/g, function (aChar) {
//                 return escapeHash._(aChar);
//             });
//         };
//         objGlobal.unescape = objGlobal.unescape || function (str) {
//             return str.replace(/%(u[\da-f]{4}|[\da-f]{2})/gi, function (seq) {
//                 return escapeHash._(seq);
//             });
//         };
//     }
// })();

let escapeHash = {
    _: function (input) {
        let ret = escapeHash[input];
        if (!ret) {
            if (input.length - 1) {
                ret = String.fromCharCode(input.substring(input.length - 3 ? 2 : 1));
            }
            else {
                let code = input.charCodeAt(0);
                ret = code < 256
                    ? "%" + (0 + code.toString(16)).slice(-2).toUpperCase()
                    : "%u" + ("000" + code.toString(16)).slice(-4).toUpperCase();
            }
            escapeHash[ret] = input;
            escapeHash[input] = ret;
        }
        return ret;
    }
};

module.exports = {
    escape: function (str) {
        return str.replace(/[^\w @\*\-\+\.\/]/g, function (aChar) {
            return escapeHash._(aChar);
        });
    },
    unescape: function (str) {
        return str.replace(/%(u[\da-f]{4}|[\da-f]{2})/gi, function (seq) {
            return escapeHash._(seq);
        });
    }
};
