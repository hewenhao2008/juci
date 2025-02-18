/*	
	This file is part of JUCI (https://github.com/mkschreder/juci.git)

	Copyright (c) 2015 Martin K. Schröder <mkschreder.uk@gmail.com>

	This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
*/ 

(function(scope){
	//var JUCI = exports.JUCI; 
	var $rpc = scope.UBUS; 
	
	function DefaultValidator(){
		this.validate = function(field){
			return null; // return null to signal that there was no error
		}
	}
	
	function TimeValidator(){
		this.validate = function(field){
			var parts = field.value.split(":");
			if(parts.length != 2) return gettext("please specify both hour and minute value for time separated by ':'"); 
			if(parts[0].length <= 2 && Number(parts[0]) >= 0 && Number(parts[0]) < 24 && 
				parts[1].length <= 2 && Number(parts[1]) >= 0 && Number(parts[1]) < 60){
				return null; 
			} else {
				return gettext("please enter valid time in form hh:mm"); 
			}
		}
	}
	
	function TimespanValidator(){
		var timeValidator = new TimeValidator(); 
		this.validate = function(field){
			var parts = field.value.split("-"); 
			if(parts.length != 2) return gettext("Please specify both start time and end time for schedule!"); 
			var err = timeValidator.validate({ value: parts[0] }) || 
				timeValidator.validate({ value: parts[1] }); 
			if(err) return err; 
			
			function split(value) { return value.split(":").map(function(x){ return Number(x); }); };
			var from = split(parts[0]);
			var to = split(parts[1]); 
			if((from[0]*60+from[1]) < (to[0]*60+to[1])) {
				return null; 
			} else {
				return gettext("Schedule start time must be lower than schedule end time!"); 
			}
		}
	}
	
	function WeekDayListValidator(){
		this.validate = function(field){
			if(!field.schema.allow) return null; 
			var days_valid = field.value.filter(function(x){
				return field.schema.allow.indexOf(x) != -1; 
			}).length; 
			if(!days_valid) return gettext("Please pick days between mon-sun"); 
			return null; 
		}
	}

	function PortValidator(){
		this.validate = function(field){
			if(field.value == undefined) return null; 
			var is_range = String(field.value).indexOf("-") != -1; 
			var parts = String(field.value).split("-"); 
			if(is_range && parts.length != 2) return gettext("Port range must have start and end port!"); 
			if(!is_range && parts.length != 1) return gettext("You must specify port value!"); 
			var invalid = parts.find(function(x){ return !String(x).match(/^\d+$/) || Number(x) < 1 || Number(x) > 65535; }); 
			if(invalid != undefined) return gettext("Invalid port number (must be a number between 1 and 65535!)"+" ("+invalid+")"); 
			if(is_range && Number(parts[0]) > Number(parts[1])) return gettext("Start port must be smaller or equal to end port!"); 
			return null; 
		};
	}
	
	function NumberLimitValidator(min, max){
		return function(){
			this.validate = function(field){
				if(field.value >= min && field.value <= max) return null; 
				return gettext("Number value is not within valid range") + " ("+min+"-"+max+")"; 
			}
		}
	}
	
	function IP4AddressValidator(){
		this.validate = function(field){
			if(field.value && field.value != "" && !field.value.match(/^\b(?:\d{1,3}\.){3}\d{1,3}\b$/)) return gettext("IP Address must be a valid ipv4 address!"); 
			return null;
		}
	}; 
	
	function IPAddressValidator(){
		this.validate = function(field){
			var ipv4 = new IP4AddressValidator();
			var ipv6 = new IP6AddressValidator();
			if(ipv4.validate(field) == null || ipv6.validate(field) == null) return null
			return gettext("IP Address must be a valid ipv4 or ipv6 address!");
		}
	}; 

	function IP6AddressValidator(){
		this.validate = function(field){
			if(field.value && field.value != "" && !field.value.match("("+
				"([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|"+ //          # 1:2:3:4:5:6:7:8
				"([0-9a-fA-F]{1,4}:){1,7}:|"+ //                         # 1::                              1:2:3:4:5:6:7::
				"([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|"+ //         # 1::8             1:2:3:4:5:6::8  1:2:3:4:5:6::8
				"([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|"+ //  # 1::7:8           1:2:3:4:5::7:8  1:2:3:4:5::8
				"([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|"+ //  # 1::6:7:8         1:2:3:4::6:7:8  1:2:3:4::8
				"([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|"+ //  # 1::5:6:7:8       1:2:3::5:6:7:8  1:2:3::8
				"([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|"+ //  # 1::4:5:6:7:8     1:2::4:5:6:7:8  1:2::8
				"[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|"+ //       # 1::3:4:5:6:7:8   1::3:4:5:6:7:8  1::8  
				":((:[0-9a-fA-F]{1,4}){1,7}|:)|"+ //                     # ::2:3:4:5:6:7:8  ::2:3:4:5:6:7:8 ::8       ::     
				"fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|"+ //     # fe80::7:8%eth0   fe80::7:8%1     (link-local IPv6 addresses with zone index)
				"::(ffff(:0{1,4}){0,1}:){0,1}"+ //
				"((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}"+ //
				"(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|"+ //          # ::255.255.255.255   ::ffff:255.255.255.255  ::ffff:0:255.255.255.255  (IPv4-mapped IPv6 addresses and IPv4-translated addresses)
				"([0-9a-fA-F]{1,4}:){1,4}:"+ //
				"((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}"+ //
				"(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])"+ //           # 2001:db8:3:4::192.0.2.33  64:ff9b::192.0.2.33 (IPv4-Embedded IPv6 Address)
				")")) return gettext("IPv6 Aaddress must be a valid ipv6 address"); 
			return null; 
		}
	} 

	function MACAddressValidator(){
		this.validate = function(field){
			if(!(typeof field.value == "string") ||
				!field.value.match(/^(?:[A-Fa-f0-9]{2}[:-]){5}(?:[A-Fa-f0-9]{2})$/)) 
				return gettext("Value must be a valid MAC-48 address"); 
			return null; 
		}
	};	 

	function MACListValidator(){
		this.validate = function(field){
			if(field.value instanceof Array){
				var errors = []; 
				field.value.map(function(value){
					if(!value.match(/^(?:[A-Fa-f0-9]{2}[:-]){5}(?:[A-Fa-f0-9]{2})$/))
						errors.push(gettext("value must be a valid MAC-48 address")+": "+value); 
				}); 
				if(errors.length) return errors.join(", "); 
			}
			return null; 
		}
	}; 


	
	var section_types = {};
	function UCI(){
		
	}
	(function(){
		function UCIField(value, schema){
			if(!schema) throw new Error("No schema specified for the field!"); 
			this.ovalue = value; 
			if(value != null && value instanceof Array) {
				this.ovalue = []; Object.assign(this.ovalue, value); 
			} 
			this.is_dirty = false; 
			this.uvalue = undefined; 
			this.schema = schema; 
			if(schema.validator) this.validator = new schema.validator(); 
			else this.validator = new DefaultValidator(); 
		}
		UCIField.prototype = {
			$reset: function(){
				this.uvalue = this.ovalue; 
				this.is_dirty = false; 
			}, 
			$reset_defaults: function(){
				this.uvalue = this.schema.dvalue;
				this.is_dirty = false;
			},
			$begin_edit: function(){
				this.svalue = this.value; 
			},
			$cancel_edit: function(){
				if(this.svalue != undefined) this.value = this.svalue; 
			},
			$update: function(value){
				if(this.dvalue instanceof Array){
					Object.assign(this.ovalue, value); 
					Object.assign(this.uvalue, value); 
				} else {
					this.ovalue = this.uvalue = value; 
				}
				this.is_dirty = false; 
			}, 
			get value(){
				if(this.schema.type == Boolean){
					var uvalue = (this.uvalue == undefined)?this.ovalue:this.uvalue; 
					if(uvalue === "true" || uvalue === "1" || uvalue === "on" || uvalue === "yes") return true; 
					else if(uvalue === "false" || uvalue === "0" || uvalue === "off" || uvalue === "no") return false; 
				}
				if(this.uvalue == undefined) return this.ovalue;
				else return this.uvalue; 
			},
			set value(val){
				// do not update if value has not changed
				if(val == this.uvalue) return; 
				// properly handle booleans
				if(this.schema.type == Boolean){
					if(this.ovalue == "on" || this.ovalue == "off") { this.uvalue = (val)?"on":"off"; }
					else if(this.ovalue == "yes" || this.ovalue == "no") { this.uvalue = (val)?"yes":"no"; }
					else if(this.ovalue == "true" || this.ovalue == "false") { this.uvalue = (val)?"true":"false"; } 
					else this.uvalue = val; 
				} else {
					if(val instanceof Array) {
						this.uvalue = []; 
						Object.assign(this.uvalue, val); 
					} else {
						this.uvalue = val; 
					}
				}
				// always set dirty when changed 
				this.is_dirty = true; 
			},
			get error(){
				// make sure we ignore errors if value is default and was not changed by user
				if(this.uvalue == this.schema.dvalue) return null; 
				if(this.validator) return this.validator.validate(this); 
				return null; 
			},
			get valid(){
				if(this.validator) return this.validator.validate(this) == null; 
				return true; 
			}, 
			set dirty(value){
				this.is_dirty = value; 
			},
			get dirty(){
				if(this.is_dirty || this.uvalue != this.ovalue) return true; 
				return false; 
			}
		}
		UCI.Field = UCIField; 
	})(); 
	(function(){
		function UCISection(config){
			this[".config"] = config; 
		}
		
		UCISection.prototype.$update = function(data){
			if(!(".type" in data)) throw new Error("Supplied object does not have required '.type' field!"); 
			// try either <config>-<type> or just <type>
			var sconfig = section_types[this[".config"][".name"]]; 
			if((typeof sconfig) == "undefined") throw new Error("Missing type definition for config "+this[".config"][".name"]+"!"); 
			var type = 	sconfig[data[".type"]]; 
			if(!type) {
				console.error("Section.$update: unrecognized section type "+this[".config"][".name"]+"-"+data[".type"]); 
				return; 
			}
			var self = this; 
			self[".original"] = data; 
			self[".name"] = data[".name"]; 
			self[".type"] = data[".type"]; 
			self[".section_type"] = type; 
			
			Object.keys(type).map(function(k){
				var field = self[k]; 
				if(!field) { field = self[k] = new UCI.Field("", type[k]); }
				var value = type[k].dvalue; 
				if(!(k in data)) { 
					//console.log("Field "+k+" missing in data!"); 
				} else {
					switch(type[k].type){
						case Number: 
							var n = Number(data[k]); 
							if(isNaN(n)) n = type.dvalue;
							value = n; 
							break; 
						case Array: 
							if(!(data[k] instanceof Array)) value = [data[k]]; 
							else value = data[k];  
							if(!value) value = []; 
							break; 
						//case Boolean: 
							//if(data[k] === "true" || data[k] === "1" || data[k] === "on") value = true; 
							//else if(data[k] === "false" || data[k] === "0" || data[k] == "off") value = false; 
						//	break; 
						default: 
							value = data[k]; 
					}
				}
				field.$update(value); 
			}); 
		}
		
		UCISection.prototype.$sync = function(){
			var deferred = $.Deferred(); 
			var self = this; 

			if(!$rpc.uci) {
				setTimeout(function(){ deferred.reject(); }, 0); 
				return deferred.promise(); 
			}
			
			$rpc.uci.get({
				config: self[".config"][".name"], 
				section: self[".name"]
			}).done(function(data){
				self.$update(data.values);
				deferred.resolve(); 
			}).fail(function(){
				deferred.reject(); 
			}); 
			return deferred.promise(); 
		}
		
		/*
		UCISection.prototype.$save = function(){
			var deferred = $.Deferred(); 
			var self = this; 
			
			// try to validate the section using section wide validator
			if(self[".validator"] instanceof Function) self[".validator"](self); 
			
			$rpc.uci.set({
				config: self[".config"][".name"], 
				section: self[".name"], 
				values: self.$getChangedValues()
			}).done(function(data){
				deferred.resolve(); 
			}).fail(function(){
				deferred.reject(); 
			}); 
			return deferred.promise(); 
		}*/
		
		UCISection.prototype.$delete = function(){
			var self = this; 
			if(self[".config"]) return self[".config"].$deleteSection(self); 
			var def = $.Deferred(); 
			setTimeout(function(){
				def.reject(); 
			}, 0); 
			return def.promise(); 
		}
		
		UCISection.prototype.$reset = function(){
			var self = this; 
			Object.keys(self).map(function(k){
				if(!(self[k] instanceof UCI.Field)) return;
				if(self[k].$reset) 
					self[k].$reset(); 
			}); 
		}

		UCISection.prototype.$reset_defaults = function(exc){
			var self = this;
			var exceptions = {}
			if(exc && exc instanceof Array)
				exc.map(function(e){ exceptions[e] = true;});
			Object.keys(self).map(function(k){
				if(!(self[k] instanceof UCI.Field) || exceptions[k]) return;
				if(self[k].$reset_defaults)
					self[k].$reset_defaults();
			});
		}
		
		UCISection.prototype.$begin_edit = function(){
			var self = this; 
			Object.keys(self).map(function(k){
				if(!(self[k] instanceof UCI.Field)) return;
				if(self[k].$begin_edit)
					self[k].$begin_edit();
			});
		}
	
		UCISection.prototype.$cancel_edit = function(){
			var self = this; 
			Object.keys(self).map(function(k){
				if(!(self[k] instanceof UCI.Field)) return;
				if(self[k].$cancel_edit)
					self[k].$cancel_edit();
			});
		}

		UCISection.prototype.$getErrors = function(){
			var errors = []; 
			var self = this; 
			var type = self[".section_type"]; 
			Object.keys(type).map(function(k){
				var err = self[k].error; 
				if(err){
					errors.push(k+": "+err); 
				}
			}); 
			var type = this[".section_type"]; 
			if(type && type[".validator"] && (type[".validator"] instanceof Function)){
				try {
					var e = type[".validator"](self); 
					if(e) errors.push(e); 
				} catch(e){
					errors.push(e); 
				}
			}
			return errors; 
		}
		
		UCISection.prototype.$getChangedValues = function(){
			var type = this[".section_type"]; 
			if(!type) return {}; 
			var self = this; 
			var changed = {}; 
			
			//if(type[".validator"] instanceof Function) type[".validator"](self); 
			
			Object.keys(type).map(function(k){
				if(self[k] && self[k].dirty){ 
					//console.log("Adding dirty field: "+k); 
					changed[k] = self[k].uvalue; 
				}
			}); 
			return changed; 
		}
		UCI.Section = UCISection; 
	})(); 
	(function(){
		function UCIConfig(uci, name){
			var self = this; 
			self.uci = uci; 
			self[".name"] = name; 
			self["@all"] = []; 
			if(!name in section_types) throw new Error("Missing type definition for config "+name); 
			
			// set up slots for all known types of objects so we can reference them in widgets
			Object.keys(section_types[name]||{}).map(function(type){
				self["@"+type] = []; 
			}); 
			//this["@deleted"] = []; 
		}
		
		function _insertSection(self, item){
			//console.log("Adding local section: "+self[".name"]+"."+item[".name"]); 
			var section = new UCI.Section(self); 
			section.$update(item); 
			var type = "@"+item[".type"]; 
			if(!(type in self)) self[type] = []; 
			self[type].push(section); 
			self["@all"].push(section); 
			self[item[".name"]] = section; 
			return section; 
		}
		function _updateSection(self, item){
			var section = self[item[".name"]]; 
			if(section && section.$update) section.$update(item); 
		}
		
		function _unlinkSection(self, section){
			// NOTE: can not use filter() because we must edit the list in place 
			// in order to play well with controls that reference the list! 
			console.log("Unlinking local section: "+self[".name"]+"."+section[".name"]+" of type "+section[".type"]); 
			var all = self["@all"]; 
			for(var i = 0; i < all.length; i++){
				if(all[i][".name"] === section[".name"]) {
					all.splice(i, 1); 
					break; 
				}; 
			}
			var jlist = self["@"+section[".type"]]||[]; 
			for(var j = 0; j < jlist.length; j++){
				if(jlist[j][".name"] === section[".name"]) {
					jlist.splice(j, 1); 
					break; 
				}
			}
			if(section[".name"]) delete self[section[".name"]]; 
		}
		
		UCIConfig.prototype.$getErrors = function(){
			var errors = [];
			var self = this;  
			Object.keys(self).map(function(x){
				if(self[x].constructor == UCI.Section) {
					self[x].$getErrors().map(function(e){
						if(e instanceof Array){
							errors = errors.concat(e.map(function(err){ return self[".name"]+"."+x+": "+err;}));
						}else{
							errors.push(self[".name"]+"."+x+": "+e);
						}
					}); 
				}
			}); 
			return errors; 
		}
	
		UCIConfig.prototype.$mark_for_reload = function(){
			this.deferred = null; 
		}

		UCIConfig.prototype.$sync = function(){
			var deferred = $.Deferred(); 
			var self = this; 
		
			if(self.deferred) return self.deferred.promise(); 
			
			self.deferred = deferred; 

			if(!$rpc.uci) {
				// this will happen if there is no router connection!
				setTimeout(function(){ deferred.reject(); }, 0); 
				return deferred.promise(); 
			}

			var to_delete = {}; 
			Object.keys(self).map(function(x){
				// prevent deletion of automatically created type sections with default value which are created by registerSectionType..
				if(self[x].constructor == UCI.Section && self[x][".type"] != self[x][".name"]) to_delete[x] = self[x]; 
			}); 
			//console.log("To delete: "+Object.keys(to_delete)); 
		
			$rpc.uci.revert({
				config: self[".name"]//, 
				//ubus_rpc_session: $rpc.$sid()
			}).always(function(){ // we have to use always because we always want to sync regardless if reverts work or not ( they will not if the config is readonly! )
				$rpc.uci.get({
					config: self[".name"]
				}).done(function(data){
					var vals = data.values;
					Object.keys(vals).filter(function(x){
						return vals[x][".type"] in section_types[self[".name"]]; 
					}).map(function(k){
						if(!(k in self)) _insertSection(self, vals[k]); 
						else _updateSection(self, vals[k]); 
						delete to_delete[k]; 
					}); 
					
					// now delete any section that no longer exists in our local cache
					async.eachSeries(Object.keys(to_delete), function(x, next){
						if(!to_delete[x]) { next(); return; }
						var section = to_delete[x]; 
						//console.log("Would delete section "+section[".name"]+" of type "+section[".type"]); 
						_unlinkSection(self, section); 
						next(); 
					}, function(){
						deferred.resolve();
					});  
				}).fail(function(){
					deferred.reject(); 
				}); 
			}); 
			return deferred.promise(); 
		}
		// set object values on objects that match search criteria 
		// if object does not exist, then create a new object 
		UCIConfig.prototype.set = function(search, values){
			var self = this; 
			self["@all"].map(function(item){
				var match = Object.keys(search).filter(function(x){ item[x] != search[x]; }).length == 0; 
				if(match){
					Object.keys(values).map(function(x){
						item[x].value = values[x]; 
					}); 
				}
			}); 
		}
		
		UCIConfig.prototype.$registerSectionType = function(name, descriptor, validator){
			var config = this[".name"]; 
			var conf_type = section_types[config]; 
			if(name in conf_type) throw new Error("Section "+name+" already defined. Please fix your code!"); 
			if(typeof conf_type === "undefined") conf_type = section_types[config] = {}; 
			conf_type[name] = descriptor; 
			this["@"+name] = []; 
			if(validator !== undefined && validator instanceof Function) conf_type[name][".validator"] = validator; 
			//console.log("Registered new section type "+config+"."+name); 
		}
		
		UCIConfig.prototype.$insertDefaults = function(typename, sectionname){
			if(!sectionname) sectionname = typename; 
			// insert a default section with the same name as the type
			// this allows us to use $uci.config.section.setting.value without having to first check for the existence of the section.
			// we will get defaults by default and if the section exists in the config file then we will get the values from the config.
			_insertSection(this, { ".type": typename, ".name": sectionname });  
		}

		UCIConfig.prototype.$deleteSection = function(section){
			var self = this; 
			var deferred = $.Deferred(); 
				
			if(!$rpc.uci) {
				// this will happen if there is no router connection!
				setTimeout(function(){ deferred.reject(); }, 0); 
				return deferred.promise(); 
			}

			//self[".need_commit"] = true; 
			console.log("Removing section "+JSON.stringify(section[".name"])); 
			$rpc.uci.delete({
				"config": self[".name"], 
				"section": section[".name"]
			}).done(function(){
				_unlinkSection(self, section); 
				console.log("Deleted section "+self[".name"]+"."+section[".name"]); 
				self[".need_commit"] = true; 
				deferred.resolve(); 
			}).fail(function(){
				console.error("Failed to delete section!"); 
				deferred.reject(); 
			}); 
			return deferred.promise(); 
		}
		
		// creates a new object that will have values set to values
		UCIConfig.prototype.create = function(item, offline){
			console.error("UCI.section.create is deprecated. Use $create() instead!"); 
			return this.$create(item, offline); 
		}

		UCIConfig.prototype.$create = function(item, offline){
			var self = this; 
			if(!(".type" in item)) throw new Error("Missing '.type' parameter!"); 
			var type = section_types[self[".name"]][item[".type"]]; 
			if(!type) throw Error("Trying to create section of unrecognized type ("+self[".name"]+"."+item[".type"]+")"); 
		
			var deferred = $.Deferred(); 
			
			if(!$rpc.uci) {
				// this will happen if there is no router connection!
				setTimeout(function(){ deferred.reject(); }, 0); 
				return deferred.promise(); 
			}

			// TODO: validate values!
			var values = {}; 
			Object.keys(type).map(function(k){ 
				if(k in item && item[k] != null && item[k] != undefined) values[k] = item[k]; 
				else if(type[k].dvalue != null && type[k].dvalue != undefined){
					//if(type[k].required) throw Error("Missing required field "+k); 
					values[k] = type[k].dvalue; 
				}
			}); 
			
			if((".name" in item) && (item[".name"] in self)){ // section with specified name already exists
				setTimeout(function(){
					deferred.reject("Section with name "+item[".name"]+" already exists in config "+self[".name"]); 
				}, 0); 
				return deferred.promise(); 
			}
			
			console.log("Adding: "+JSON.stringify(item)+" to "+self[".name"]+": "+JSON.stringify(values)); 
			$rpc.uci.add({
				"config": self[".name"], 
				"type": item[".type"],
				"name": item[".name"], 
				"values": values
			}).done(function(state){
				console.log("Added new section: "+JSON.stringify(state)); 
				item[".name"] = state.section; 
				self[".need_commit"] = true; 
				var section = _insertSection(self, item); 
				//section[".new"] = true; 
				deferred.resolve(section); 
			}).fail(function(){
				deferred.reject(); 
			});
			return deferred.promise(); 
		}
	
		//! Tells uci to reorder sections based on current order in the section types table
		UCIConfig.prototype.$save_order = function(type){
			var def = $.Deferred(); 
			var arr = this["@"+type]; 
			var self = this; 
			if(!arr){
				console.error("UCI."+self[".name"]+".$reorder: not such section types, got "+type); 
				setTimeout(function(){ def.reject(); }, 0); 
				return def.promise(); 
			}
			// get section order and send it to uci. This will be applied when user does $save(); 
			var order = arr.map(function(x){ return x[".name"]; }).filter(function(x){ return x; }); 
			$rpc.uci.order({ 
				config: self[".name"], 
				sections: order
			}).done(function(){ def.resolve(); }).fail(function(){ def.reject(); });
			return def.promise(); 
		}
		
		UCIConfig.prototype.$getWriteRequests = function(){
			var self = this; 
			var reqlist = []; 
			self["@all"].map(function(section){
				var changed = section.$getChangedValues(); 
				//console.log(JSON.stringify(changed) +": "+Object.keys(changed).length); 
				if(Object.keys(changed).length){
					reqlist.push({
						"config": self[".name"], 
						"section": section[".name"], 
						"values": changed
					}); 
				}
			}); 
			return reqlist; 
		}
		
		UCI.Config = UCIConfig; 
	})(); 
	
	UCI.prototype.$init = function(){
		var deferred = $.Deferred(); 
		console.log("Init UCI"); 
		var self = this; 

		if(!$rpc.uci) {
			setTimeout(function(){ deferred.reject(); }, 0); 
			return deferred.promise(); 
		}
		
		$rpc.uci.configs().done(function(response){
			var cfigs = response.configs; 
			if(!cfigs) { next("could not retrieve list of configs!"); return; }
			cfigs.map(function(k){
				if(!(k in section_types)) {
					console.log("Missing type definition for config "+k); 
					return; 
				}
				if(!(k in self)){
					//console.log("Adding new config "+k); 
					self[k] = new UCI.Config(self, k); 
				}
			}); 
			deferred.resolve(); 
		}).fail(function(){
			deferred.reject(); 
		}); 
		return deferred.promise(); 
	}
	
	UCI.prototype.$registerConfig = function(name){
		if(!(name in section_types)) section_types[name] = {}; 
		if(!(name in this)) this[name] = new UCI.Config(this, name); 
	}
	
	UCI.prototype.$eachConfig = function(cb){
		var self = this; 
		Object.keys(self).filter(function(x){ 
			return self[x].constructor == UCI.Config; 
		}).map(function(x){
			cb(self[x]); 
		});
	}
	 
	UCI.prototype.$sync = function(configs){
		var deferred = $.Deferred(); 
		var self = this; 
		
		async.series([
			function(next){
				if(configs == undefined || configs.length == 0) { 
					// if no argument provided then we sync all configs
					configs = Object.keys(self).filter(function(x){ 
						return self[x].constructor == UCI.Config; 
					}); 
					//next(); return; 
				} else if(!(configs instanceof Array)) {
					configs = [configs]; 
				}
				async.eachSeries(configs, function(cf, next){
					if(!(cf in self)) { 
						//throw new Error("invalid config name "+cf); 
						// NOTE: this can not throw because we need to sync all configs that we can sync
						// TODO: decide on whether to always resolve if at least one config compiles
						// or to always reject if at least one config fails. 
						console.error("invalid config name "+cf); 
						next(); 
						return; 
					} /*else if(self[cf].$lastSync){
						var SYNC_TIMEOUT = 10000; // probably make this configurable
						if(((new Date()).getTime() - self[cf].$lastSync.getTime()) > SYNC_TIMEOUT){
							console.log("Using cached version of "+cf); 
							next(); 
							return; 
						}
					}*/
					self[cf].$sync().done(function(){
						console.log("Synched config "+cf); 
						//self[cf].$lastSync = new Date(); 
						next(); 
					}).fail(function(){
						console.error("Could not sync config "+cf); 
						next(); // continue because we want to sync as many as we can!
						//next("Could not sync config "+cf); 
					}); 
				}, function(err){
					next(err); 
				}); 
			}
		], function(err){
			setTimeout(function(){ // in case async did not defer
				if(err) deferred.reject(err); 
				else deferred.resolve(); 
			}, 0); 
		}); 
		return deferred.promise(); 
	}
	
	/*
	UCI.prototype.sync = function(opts){
		console.error("$uci.sync() is deprecated and will be replaced with $uci.$sync() in future version to avoid config collisions. Please do not use it!"); 
		return this.$sync(opts); 
	}*/

	UCI.prototype.$revert = function(){
		var revert_list = []; 
		var deferred = $.Deferred(); 
		var errors = []; 
		var self = this; 
		
		if(!$rpc.uci) {
			// this will happen if there is no router connection!
			setTimeout(function(){ deferred.reject(); }, 0); 
			return deferred.promise(); 
		}

		Object.keys(self).map(function(k){
			if(self[k].constructor == UCI.Config){
				//if(self[k][".need_commit"]) revert_list.push(self[k][".name"]); 
				revert_list.push(self[k]); 
			}
		}); 
		async.eachSeries(revert_list, function(item, next){
			$rpc.uci.revert({"config": item[".name"], "ubus_rpc_session": $rpc.$sid()}).done(function(){
				console.log("Reverted config "+item[".name"]); 
				next(); 
			}).fail(function(){
				errors.push("Failed to revert config "+item[".name"]); 
				next(); 
			}); 
		}, function(){
			if(errors.length) deferred.reject(errors); 
			else deferred.resolve(); 
		}); 
		return deferred.promise(); 
	}
	
	UCI.prototype.$rollback = function(){
		if(!$rpc.uci) {
			var deferred = $.Deferred(); 
			setTimeout(function(){ deferred.reject(); }, 0); 
			return deferred.promise(); 
		}

		return $rpc.uci.rollback(); 
	}
	
	UCI.prototype.$apply = function(){
		console.error("Apply method is deprecated and will be removed. Use $save() instead."); 
		return this.$save(); 
		//return $rpc.uci.apply({rollback: 0, timeout: 5000}); 
	}
	
	UCI.prototype.$save = function(){
		var deferred = $.Deferred(); 
		var self = this; 
		var writes = []; 
		var add_requests = []; 
		var errors = []; 
		
		if(!$rpc.uci) {
			setTimeout(function(){ deferred.reject(); }, 0); 
			return deferred.promise(); 
		}

		async.series([
			function(next){ // send all changes to the server
				console.log("Checking for errors..."); 
				Object.keys(self).map(function(k){
					if(self[k].constructor == UCI.Config){
						var err = self[k].$getErrors(); 
						if(err && err.length) {
							err.map(function(e){
								console.error("UCI error ["+k+"]: "+e); 
							}); 
							errors = errors.concat(err);
							return; 
						} 
						var reqlist = self[k].$getWriteRequests(); 
						reqlist.map(function(x){ writes.push(x); });  
					}
				}); 
				console.log("Writing changes: "+JSON.stringify(writes)); 
				async.eachSeries(writes, function(cmd, next){
					$rpc.uci.set(cmd).done(function(response){
						console.log("... "+cmd.config+": "+JSON.stringify(response)); 
						self[cmd.config][".need_commit"] = true; 
						next(); 
					}).fail(function(){
						console.error("Failed to write config "+cmd.config); 
						next(); 
					}); 
				}, function(){
					next(); 
				}); 
			}, 
			function(next){
				if(errors.length) {
					deferred.reject(errors); 
					return; 
				}
				// this will prevent making ubus call if there were no changes to apply 
				//if(writes.length == 0 && !){
				//	deferred.resolve(); 
				//	return; 
				//} commenting out because we do need to commit if new sections have been added
				$rpc.uci.apply({rollback: 0, timeout: 5000}).done(function(){
					async.eachSeries(Object.keys(self), function(config, next){
						if(self[config].constructor != UCI.Config || !self[config][".need_commit"]) {
							next(); 
							return; 
						}
						console.log("Committing changes to "+config); 
						$rpc.uci.commit({config: config}).done(function(){
							self[config][".need_commit"] = false; 
							self[config].$sync().done(function(){
								next(); 
							}).fail(function(err){
								console.log("error synching config "+config+": "+err); 
							}); 
						}).fail(function(err){
							errors.push("could not commit config: "+err); 
							next(); 
						}); 
						next(); 
					}, function(){
						console.log("Commit done!"); 
						// this is to always make sure that we do this outside of this code flow
						setTimeout(function(){
							if(errors && errors.length) deferred.reject(errors); 
							else deferred.resolve(); 
						},0); 
					}); 
				}).fail(function(error){
					// Apply may fail for a number of reasons (for example if there is nothing to apply) 
					// but it does not matter so we should not fail when it does not succeed. 
					deferred.resolve(); 
					//deferred.reject([error]); 
				}); 
			}
		]); 
		return deferred.promise(); 
	}
	
	UCI.prototype.save = function(){
		console.error("$uci.save() is deprecated. This method will be replaced with $uci.$save() in future versions to avoid config collisions. Please update your code."); 
		return this.$save(); 
	}

	scope.UCI = new UCI(); 
	scope.UCI.validators = {
		WeekDayListValidator: WeekDayListValidator, 
		TimespanValidator: TimespanValidator, 
		PortValidator: PortValidator, 
		NumberLimitValidator: NumberLimitValidator, 
		TimeValidator: TimeValidator,
		MACAddressValidator: MACAddressValidator,
		MACListValidator: MACListValidator,
		IPAddressValidator: IPAddressValidator,
		IP6AddressValidator: IP6AddressValidator,
		IP4AddressValidator: IP4AddressValidator
	}; 
	/*if(exports.JUCI){
		var JUCI = exports.JUCI; 
		JUCI.uci = exports.uci = new UCI(); 
		if(JUCI.app){
			JUCI.app.factory('$uci', function(){
				return $juci.uci; 
			}); 
		}
	}*/
})(typeof exports === 'undefined'? this : global); 
