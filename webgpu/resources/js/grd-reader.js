var PSDGradient;
(function (PSDGradient) {
    var CSSCreator = (function () {
        function CSSCreator() { }
        CSSCreator.prototype.createGradientStyle = function (grad, options) {
            var vendors = [
                "-webkit-", 
                "-moz-", 
                "-o-", 
                "-ms-"
            ];
            var background = '  background: #{prefix}linear-gradient(top,';
            var prefixs = vendors.map(function (e) {
                return background.replace("#{prefix}", e);
            });
            prefixs.push("  linear-gradient(to bottom,");
            var stops = this.createGradeientStops(grad).map(function (e) {
                return "    " + e;
            }).join(",\n");
            var styles = prefixs.map(function (e) {
                return [
                    e, 
                    stops, 
                    "  );"
                ].join("\n");
            });
            return styles.join("\n");
        };
        CSSCreator.prototype.create = function (grad, options) {
            var selector = options.selector + "{";
            var css = [
                selector, 
                this.createGradientStyle(grad, options), 
                "}"
            ].join("\n");
            return css;
        };
        CSSCreator.prototype.createGradeientStops = function (grad_obj) {
            return grad_obj.gradient_stops.map(function (grad) {
                var color = grad.color_stop.color_obj.color;
                var lctn = (grad.color_stop.lctn * 100) / 4096;
                var opacity = grad.opacity / 100;
                if(grad.color_stop.color_obj.type == "RGBC") {
                    var rgba = [
                        Math.round(color.r), 
                        Math.round(color.g), 
                        Math.round(color.b), 
                        opacity
                    ].join(', ');
                    return "rgba(#rgba) #lctn%".replace("#rgba", rgba).replace("#lctn", lctn.toString());
                } else {
                    var hsla = [
                        Math.round(color.hue).toString(), 
                        Math.round(color.saturation).toString() + "%", 
                        Math.round(color.brigtness).toString() + "%", 
                        opacity.toString()
                    ].join(', ');
                    return "hsla(#hsla) #lctn%".replace("#hsla", hsla).replace("#lctn", lctn.toString());
                }
            });
        };
        return CSSCreator;
    })();
    PSDGradient.CSSCreator = CSSCreator;    
})(PSDGradient || (PSDGradient = {}));

var PSDGradient;
(function (PSDGradient) {
    var SVGCreator = (function () {
        function SVGCreator() { }
        SVGCreator.prototype.create = function (grad, options) {
            var begin_tag = '<linearGradient id="#id">';
            if(options && options.id) {
                begin_tag = begin_tag.replace('#id', options.id);
            } else {
                begin_tag = begin_tag.replace('id="#id"', "");
            }
            var end_tag = '</linearGradient>';
            var stops = this.createGradeientStops(grad).map(function (e) {
                return "    " + e;
            }).join("\n");
            return [
                begin_tag, 
                stops, 
                end_tag
            ].join("\n");
        };
        SVGCreator.prototype.createGradeientStops = function (grad_obj) {
            return grad_obj.gradient_stops.map(function (grad) {
                var color = grad.color_stop.color_obj.color;
                var lctn = (grad.color_stop.lctn * 100) / 4096;
                var opacity = grad.opacity / 100;
                if(grad.color_stop.color_obj.type == "RGBC") {
                    var rgba = [
                        Math.round(color.r), 
                        Math.round(color.g), 
                        Math.round(color.b), 
                        opacity
                    ].join(', ');
                    return "<stop stop-color='rgba(#rgba)' offset='#lctn%'/>".replace("#rgba", rgba).replace("#lctn", lctn.toString());
                } else {
                    var hsla = [
                        Math.round(color.hue).toString(), 
                        Math.round(color.saturation).toString() + "%", 
                        Math.round(color.brigtness).toString() + "%", 
                        opacity.toString()
                    ].join(', ');
                    return "<stop stop-color='hsla(#hsla)' offset='#lctn%'/>".replace("#hsla", hsla).replace("#lctn", lctn.toString());
                }
            });
        };
        return SVGCreator;
    })();
    PSDGradient.SVGCreator = SVGCreator;    
})(PSDGradient || (PSDGradient = {}));

var PSDGradient;
(function (PSDGradient) {
    var SimpleObjectCreator = (function () {
        function SimpleObjectCreator() { }
        SimpleObjectCreator.simple_types = [
            "LongT", 
            "StringT", 
            "DoubT", 
            "UnicodeT", 
            "BoolT", 
            "TextT"
        ];
        SimpleObjectCreator.prototype.is_simple_type = function (obj_type) {
            return SimpleObjectCreator.simple_types.some(function (type) {
                return type == obj_type;
            });
        };
        SimpleObjectCreator.getTypeName = function getTypeName(obj) {
            var funcNameRegex = /function (.{1,})\(/;
            var results = (funcNameRegex).exec((obj).constructor.toString());
            return (results && results.length > 1) ? results[1] : "";
        }
        SimpleObjectCreator.prototype.walk = function (obj) {
            var _this = this;
            var obj_type = SimpleObjectCreator.getTypeName(obj);
            if(this.is_simple_type(obj_type)) {
                return obj.value;
            } else {
                if(obj_type == "UntFT") {
                    return {
                        type: obj.type,
                        value: obj.value
                    };
                } else {
                    if(obj_type == "KeyValueT") {
                        var ret = {
                        };
                        ret[obj.name] = this.walk(obj.value);
                        return ret;
                    } else {
                        if(obj_type == "EnumT") {
                            return {
                                type: obj.type,
                                value: obj.value
                            };
                        } else {
                            if(obj_type == "ObjcT") {
                                var values = obj.values.reduce(function (accum, value) {
                                    var props = _this.walk(value);
                                    for(var prop in props) {
                                        accum[prop] = props[prop];
                                    }
                                    return accum;
                                }, {
                                });
                                return {
                                    name: obj.name,
                                    typename: obj.typename,
                                    values: values
                                };
                            } else {
                                if(obj_type == "VlLsT") {
                                    return obj.values.map(function (value) {
                                        return _this.walk(value);
                                    });
                                } else {
                                    if(obj_type == "Discriptor") {
                                        var ret = {
                                        };
                                        ret[obj.key] = this.walk(obj.value);
                                        return ret;
                                    } else {
                                        throw new Error("SimpleObjectCreator not support type:" + obj_type);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
        return SimpleObjectCreator;
    })();
    PSDGradient.SimpleObjectCreator = SimpleObjectCreator;    
})(PSDGradient || (PSDGradient = {}));

var PSDGradient;
(function (PSDGradient) {
    var Gradient = (function () {
        function Gradient() { }
        Gradient.prototype.buildGradientStop = function () {
            var _this = this;
            this.gradient_stops = this.clrs.map(function (clr) {
                var grad = new GradientStop();
                grad.color_stop = clr;
                grad.opacity = _this.getOpacity(clr, _this.trns);
                return grad;
            });
        };
        Gradient.prototype.getOpacity = function (clr, trns) {
            var index = -1;
            for(var i = 0; i < trns.length; i++) {
                var t = trns[i];
                if(t.lctn >= clr.lctn) {
                    index = i;
                    break;
                }
            }
            if(index == 0) {
                return trns[0].opacity;
            } else {
                if(index == -1) {
                    return trns[trns.length - 1].opacity;
                } else {
                    var pre = trns[index - 1];
                    var next = trns[index];
                    return this.loctOpacity(pre, next, clr.lctn);
                }
            }
        };
        Gradient.prototype.loctOpacity = function (trns, trns2, lctn) {
            var w_lctn = trns2.lctn - trns.lctn;
            var h_lctn = trns2.opacity - trns.opacity;
            if(w_lctn == 0) {
                return trns.opacity;
            } else {
                var m = h_lctn / w_lctn;
                var b = trns.opacity - (m * trns.lctn);
                return m * lctn + b;
            }
        };
        return Gradient;
    })();
    PSDGradient.Gradient = Gradient;    
    var ColorStop = (function () {
        function ColorStop() { }
        return ColorStop;
    })();
    PSDGradient.ColorStop = ColorStop;    
    var TransparencyStop = (function () {
        function TransparencyStop() { }
        return TransparencyStop;
    })();
    PSDGradient.TransparencyStop = TransparencyStop;    
    var GradientStop = (function () {
        function GradientStop() { }
        return GradientStop;
    })();
    PSDGradient.GradientStop = GradientStop;    
    var ColorObj = (function () {
        function ColorObj() { }
        return ColorObj;
    })();
    PSDGradient.ColorObj = ColorObj;    
    var RGBColor = (function () {
        function RGBColor() { }
        return RGBColor;
    })();
    PSDGradient.RGBColor = RGBColor;    
    var HSBColor = (function () {
        function HSBColor() { }
        return HSBColor;
    })();
    PSDGradient.HSBColor = HSBColor;    
    var GradientCreator = (function () {
        function GradientCreator() { }
        GradientCreator.prototype.createTransparencyStops = function (list) {
            var transparency_stops = [];
            list.forEach(function (e) {
                var trans_stop = new TransparencyStop();
                var obj = e["Objc"];
                var values = obj["values"];
                trans_stop.opacity = values["Opct"]["UntF"]["value"];
                trans_stop.lctn = values["Lctn"]["long"];
                trans_stop.mdpn = values["Mdpn"]["long"];
                transparency_stops.push(trans_stop);
            });
            return transparency_stops;
        };
        GradientCreator.prototype.createRGBColor = function (color_data) {
            var color = new RGBColor();
            var color_data_values = color_data["values"];
            color.r = color_data_values["Rd  "]["doub"];
            color.g = color_data_values["Grn "]["doub"];
            color.b = color_data_values["Bl  "]["doub"];
            return color;
        };
        GradientCreator.prototype.createHSBColor = function (color_data) {
            var color = new HSBColor();
            var color_data_values = color_data["values"];
            color.hue = color_data_values["H   "]["UntF"]["value"];
            color.saturation = color_data_values["Strt"]["doub"];
            color.brigtness = color_data_values["Brgh"]["doub"];
            return color;
        };
        GradientCreator.prototype.createColorStops = function (list) {
            var _this = this;
            var color_stops = [];
            list.forEach(function (e) {
                var color_stop = new ColorStop();
                var obj = e["Objc"];
                var values = obj["values"];
                color_stop.type = values["Type"];
                color_stop.lctn = values["Lctn"]["long"];
                color_stop.mdpn = values["Mdpn"]["long"];
                var color_obj = new ColorObj();
                var color_data = values["Clr "]["Objc"];
                color_obj.type = color_data["typename"];
                if(color_obj.type == "RGBC") {
                    color_obj.color = _this.createRGBColor(color_data);
                } else {
                    if(color_obj.type == "HSBC") {
                        color_obj.color = _this.createHSBColor(color_data);
                    } else {
                    }
                }
                color_stop.color_obj = color_obj;
                color_stops.push(color_stop);
            });
            return color_stops;
        };
        GradientCreator.prototype.createGradient = function (d) {
            var values = d["values"];
            var grad = new Gradient();
            grad.obj_name = d["name"];
            grad.name = values["Nm  "]["TEXT"];
            grad.clrs = this.createColorStops(values["Clrs"]["VlLs"]);
            grad.trns = this.createTransparencyStops(values["Trns"]["VlLs"]);
            return grad;
        };
        return GradientCreator;
    })();
    PSDGradient.GradientCreator = GradientCreator;    
})(PSDGradient || (PSDGradient = {}));

var __extends = this.__extends || function (d, b) {
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
}
var PSDGradient;
(function (PSDGradient) {
    var BaseT = (function () {
        function BaseT() { }
        BaseT.prototype.parse = function (stream) {
            this.offset = stream.tell();
            var ret = this._parse(stream);
            this.byte_length = stream.tell() - this.offset;
            return ret;
        };
        BaseT.prototype._parse = function (stream) {
            throw new Error("need override _parse method");
        };
        return BaseT;
    })();
    PSDGradient.BaseT = BaseT;    
    var BoolT = (function (_super) {
        __extends(BoolT, _super);
        function BoolT() {
            _super.apply(this, arguments);

        }
        BoolT.prototype._parse = function (stream) {
            this.value = stream.readUint8();
            return this.value;
        };
        return BoolT;
    })(BaseT);
    PSDGradient.BoolT = BoolT;    
    var LongT = (function (_super) {
        __extends(LongT, _super);
        function LongT() {
            _super.apply(this, arguments);

        }
        LongT.prototype._parse = function (stream) {
            this.value = stream.readInt32();
            return this.value;
        };
        return LongT;
    })(BaseT);
    PSDGradient.LongT = LongT;    
    var StringT = (function (_super) {
        __extends(StringT, _super);
        function StringT(length) {
            this.length = length;
                _super.call(this);
        }
        StringT.prototype._parse = function (stream) {
            this.value = stream.readString(this.length);
            return this.value;
        };
        return StringT;
    })(BaseT);
    PSDGradient.StringT = StringT;    
    var DoubT = (function (_super) {
        __extends(DoubT, _super);
        function DoubT() {
            _super.apply(this, arguments);

        }
        DoubT.prototype._parse = function (stream) {
            this.value = stream.readFloat64();
            return this.value;
        };
        return DoubT;
    })(BaseT);
    PSDGradient.DoubT = DoubT;    
    var UntFT = (function (_super) {
        __extends(UntFT, _super);
        function UntFT() {
            _super.apply(this, arguments);

        }
        UntFT.prototype._parse = function (stream) {
            this.type = new StringT(4).parse(stream);
            this.value = new DoubT().parse(stream);
            return this.value;
        };
        return UntFT;
    })(BaseT);
    PSDGradient.UntFT = UntFT;    
    var UnicodeT = (function (_super) {
        __extends(UnicodeT, _super);
        function UnicodeT(length) {
            this.length = length;
                _super.call(this);
        }
        UnicodeT.prototype._parse = function (stream) {
            this.value = stream.readWideString(this.length);
            return this.value;
        };
        return UnicodeT;
    })(BaseT);
    PSDGradient.UnicodeT = UnicodeT;    
    var TdtdT = (function (_super) {
        __extends(TdtdT, _super);
        function TdtdT() {
            _super.apply(this, arguments);

        }
        TdtdT.prototype._parse = function (stream) {
            this.length = new LongT().parse(stream);
            this.value = stream.read(this.length);
            return this.value;
        };
        return TdtdT;
    })(BaseT);
    PSDGradient.TdtdT = TdtdT;    
    var TextT = (function (_super) {
        __extends(TextT, _super);
        function TextT() {
            _super.apply(this, arguments);

        }
        TextT.prototype._parse = function (stream) {
            this.length = new LongT().parse(stream);
            this.value = new UnicodeT(this.length).parse(stream);
            return this.value;
        };
        return TextT;
    })(BaseT);
    PSDGradient.TextT = TextT;    
    var EnumT = (function (_super) {
        __extends(EnumT, _super);
        function EnumT() {
            _super.apply(this, arguments);

        }
        EnumT.prototype._parse = function (stream) {
            this.length = new LongT().parse(stream) || 4;
            this.type = new StringT(this.length).parse(stream);
            this.length2 = new LongT().parse(stream) || 4;
            this.value = new StringT(this.length2).parse(stream);
            return this;
        };
        return EnumT;
    })(BaseT);
    PSDGradient.EnumT = EnumT;    
    var KeyValueT = (function (_super) {
        __extends(KeyValueT, _super);
        function KeyValueT(length) {
            if (typeof length === "undefined") { length = 4; }
            this.length = length;
                _super.call(this);
        }
        KeyValueT.prototype._parse = function (stream) {
            this.name = new StringT(this.length).parse(stream);
            this.value = new Discriptor().parse(stream);
            return this;
        };
        return KeyValueT;
    })(BaseT);
    PSDGradient.KeyValueT = KeyValueT;    
    var ObjcT = (function (_super) {
        __extends(ObjcT, _super);
        function ObjcT() {
            _super.apply(this, arguments);

        }
        ObjcT.prototype._parse = function (stream) {
            this.length = new LongT().parse(stream) || 4;
            this.name = new UnicodeT(this.length).parse(stream);
            this.typename_length = new LongT().parse(stream) || 4;
            this.typename = new StringT(this.typename_length).parse(stream);
            this.property_count = new LongT().parse(stream);
            this.values = [];
            for(var i = 0; i < this.property_count; i++) {
                var key_length = new LongT().parse(stream) || 4;
                var v = new KeyValueT(key_length);
                v.parse(stream);
                this.values.push(v);
            }
            return this;
        };
        return ObjcT;
    })(BaseT);
    PSDGradient.ObjcT = ObjcT;    
    var VlLsT = (function (_super) {
        __extends(VlLsT, _super);
        function VlLsT() {
            _super.apply(this, arguments);

        }
        VlLsT.prototype._parse = function (stream) {
            this.length = new LongT().parse(stream);
            this.values = [];
            for(var i = 0; i < this.length; i++) {
                this.values.push(new Discriptor().parse(stream));
            }
            return this;
        };
        return VlLsT;
    })(BaseT);
    PSDGradient.VlLsT = VlLsT;    
    var Discriptor = (function (_super) {
        __extends(Discriptor, _super);
        function Discriptor() {
            _super.apply(this, arguments);

        }
        Discriptor.types = {
            "Objc": ObjcT,
            "VlLs": VlLsT,
            "doub": DoubT,
            "UntF": UntFT,
            "TEXT": TextT,
            "enum": EnumT,
            "long": LongT,
            "bool": BoolT,
            "tdtd": TdtdT
        };
        Discriptor.prototype._parse = function (stream) {
            this.key = new StringT(4).parse(stream);
            var type = Discriptor.types[this.key];
            if(type == undefined) {
                throw new Error("not support Discriptor type :" + this.key);
            }
            this.value = new type();
            this.value.parse(stream);
            return this;
        };
        return Discriptor;
    })(BaseT);
    PSDGradient.Discriptor = Discriptor;    
    var IncrementParser = (function () {
        function IncrementParser(stream) {
            this.gradientCreator = new PSDGradient.GradientCreator();
            this.simpleObjcectCreator = new PSDGradient.SimpleObjectCreator();
            this.setStream(stream);
        }
        IncrementParser.prototype.setStream = function (stream) {
            this.stream = stream;
            this.length = -1;
            this.index = 0;
            this.grdl = undefined;
        };
        IncrementParser.prototype.setup = function () {
            this._headerParse(this.stream);
        };
        IncrementParser.prototype._headerParse = function (stream) {
            stream.seek(32);
            var grdl = new KeyValueT();
            grdl.name = new StringT(4).parse(stream);
            var dis = new Discriptor();
            dis.key = new StringT(4).parse(stream);
            grdl.value = dis;
            var vl = new VlLsT();
            vl.length = new LongT().parse(stream);
            dis.value = vl;
            var values = [];
            vl.values = values;
            this.grdl = grdl;
            this.length = vl.length;
            this.index = 0;
        };
        IncrementParser.prototype.hasNext = function () {
            return this.index < this.length;
        };
        IncrementParser.prototype.buildGradient = function (parsed_obj) {
            var object = this.simpleObjcectCreator.walk(parsed_obj);
            var grad_data = object["Objc"]["values"]["Grad"]["Objc"];
            var grad = this.gradientCreator.createGradient(grad_data);
            grad.buildGradientStop();
            return grad;
        };
        IncrementParser.prototype.parse = function () {
            this.index++;
            var gradient = new Discriptor().parse(this.stream);
            return this.buildGradient(gradient);
        };
        return IncrementParser;
    })();
    PSDGradient.IncrementParser = IncrementParser;    
    var GrdParser = (function () {
        function GrdParser() { }
        GrdParser.prototype.simpleParse = function (stream) {
            stream.seek(32);
            return new KeyValueT().parse(stream);
        };
        GrdParser.prototype.incrementParse = function (stream, callback) {
            stream.seek(32);
            var grdl = new KeyValueT();
            grdl.name = new StringT(4).parse(stream);
            var dis = new Discriptor();
            dis.key = new StringT(4).parse(stream);
            grdl.value = dis;
            var vl = new VlLsT();
            vl.length = new LongT().parse(stream);
            dis.value = vl;
            var values = [];
            vl.values = values;
            var parse_fn = function (index) {
                if(index < vl.length) {
                    var next = function () {
                        parse_fn(index + 1);
                    };
                    var gradient = new Discriptor().parse(stream);
                    if(callback != null) {
                        callback(gradient, index, vl.length, next);
                    }
                }
            };
            parse_fn(0);
            return grdl;
        };
        GrdParser.prototype.parse = function (stream, callback) {
            var gradientCreator = new PSDGradient.GradientCreator();
            var simpleObjcectCreator = new PSDGradient.SimpleObjectCreator();
            var fn = function (parsed_obj, index, length, next) {
                var grad;
                try  {
                    var object = simpleObjcectCreator.walk(parsed_obj);
                    var grad_data = object["Objc"]["values"]["Grad"]["Objc"];
                    grad = gradientCreator.createGradient(grad_data);
                    grad.buildGradientStop();
                } catch (ex) {
                    console.log(ex.message);
                }
                callback(grad, index, length, next);
            };
            return this.incrementParse(stream, fn);
        };
        return GrdParser;
    })();
    PSDGradient.GrdParser = GrdParser;    
})(PSDGradient || (PSDGradient = {}));
