
var assert = require("assert");
var ServerConnector = require("../src/ServerConnector");
describe('ServerConnector', function(){
    describe('#startSession()', function(){
        it('should return ', function(){
            var con = new ServerConnector("bla", {});
            assert.equal('', con.startSession({x: 5}));
        })
    })
})
