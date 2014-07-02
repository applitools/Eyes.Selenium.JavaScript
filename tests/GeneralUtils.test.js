
var assert = require("assert");
var utils = require("../src/GeneralUtils");
describe('GeneralUtils', function(){
    describe('#urlConcat()', function(){
        it('should return / when the values are empty', function(){
            assert.equal("/", utils.urlConcat('', ''));
        })
        it('should return the correct Url when both parts don\'t start/end with a "/"', function(){
            var left = "http://www.applitools.com",
                right = "subdomain/index.html"
            assert.equal(left + "/" + right, utils.urlConcat(left, right));
        })
        it('should return the correct Url when only left part ends with a "/"', function(){
            var left = "http://www.applitools.com/",
                right = "subdomain/index.html"
            assert.equal(left + right, utils.urlConcat(left, right));
        })
        it('should return the correct Url when only right part starts with a "/"', function(){
            var left = "http://www.applitools.com",
                right = "/subdomain/index.html"
            assert.equal(left + right, utils.urlConcat(left, right));
        })
        it('should return the correct Url when both parts start/end with a "/"', function(){
            var left = "http://www.applitools.com",
                right = "/subdomain/index.html"
            assert.equal(left + right, utils.urlConcat(left + "/", right));
        })
    })
})
