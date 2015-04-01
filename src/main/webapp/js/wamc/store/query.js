/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/
define(["dojo/_base/array",
        "dojo/_base/lang",
        "dojo/_base/json",
        "dojo/_base/xhr"],
        function(array,lang,json,xhr){
	
	return {
		
		buildQueryString:function(/*Object*/query){
			// summary:
			//		create a query string from a supplied query object.
			// query: Object
			//		The query object to be formatted
			// return: String
			//		The generated query string
			console.debug("wamc.query.buildQueryString",query);
			
			var q = query;
			
			if(typeof q === "string") return q;
		
			if("op" in q && "data" in q){
				// For queries generated by the grid, pass to the server
				q = this._buildExpression(q);
			}else{
				// Other queries are ignored
				q = {};
			}
			
			return xhr.objectToQuery(q);
		},
		
		_buildExpression:function(/*Object*/query){
			// summary:
			//		Build an expression object from a grid query
			// query:
			//		The grid query
			// return:
			// 		A filter expression
			// tags:
			//		protected
			
			console.debug("wamc.query._buildExpression",query);
			
			var op = query.op,
				expression = {};
			
			// If the op is a regexp with a toString function, convert it
			if(typeof op.toString === "function"){
				op = op.toString();
			}
			
			switch(op){
				case "and":
					lang.mixin(expression,this._buildExpressionType("AND",query));
					break;
				case "or": 
					lang.mixin(expression,this._buildExpressionType("OR",query));
					break;
				case "not": 
					lang.mixin(expression,this._not(query));
					break;
				case "all": 
					lang.mixin(expression,this._buildExpressionType("AND",query));
					break;
				case "any":
					lang.mixin(expression,this._buildExpressionType("OR",query));
					break;
				case "equal":
					lang.mixin(expression,this._equal(query));
					break;
				case "contain": 
					lang.mixin(expression,this._contains(query));
					break;
				case "startWith": 
					lang.mixin(expression,this._startsWith(query));
					break;
				case "endWith":
					lang.mixin(expression,this._endsWith(query));
					break;
				case "isEmpty":
					lang.mixin(expression,this._isEmpty(query));
					break;
				default: console.debug("Unsupported operator:",op);
			}
			
			return expression;
		},
		
		_buildExpressions:function(/*Object*/query){
			// summary:
			//		Build the child expressionsof this query
			// return: Object
			//		an object representing a REST query expression
			// tags:
			//		protected
			console.debug("wamc.query._buildExpressions",query);
			
			var e = {};
			
			array.forEach(query.data,function(q,index){
				
				// grab the new clause to add to the expression
				var clause = this._buildExpression(q);
				
				// If the child clause has a filterOperator of 'OR' then 
				// then it must be an 'any column' clause.
				if(typeof clause.filterOperator === "string" && clause.filterOperator === "OR"){
					clause = this._compressAnyClause(clause);
				}

				// lang.mixin overwrites properties, so if you have two clauses for 
				// the same name (eg hostname=tom OR hostname=bill) the last one wins
				// therefore we need to remember any clauses that have already been 
				// added to the expression
				
				// for each property in the new clause (only ever expecting one!?)
				for(var prop in clause){
					// check if this property already exists in the expression so far
					if (lang.isArray(e[prop])){
						// add the existing values for this property into the new clause
						clause[prop] = clause[prop].concat(e[prop]);
					}
				}
				lang.mixin(e,clause);
			},this);

			return e;
		},
		
		_buildExpressionType:function(/*String*/type,/*Object*/query){
			// summary:
			//		Build 
			// return: Object
			//		an object representing a REST query expression
			// tags:
			//		protected
			
			console.debug("wamc.query._buildExpressionType",type,query);
			
			var e = this._buildExpressions(query);
			
			e.filterOperator = type;
			
			return e;
		},

		_not:function(/*Object*/query){
			// description:
			//		To build a not query, add a ! to the start of every
			//		value in the generated expression beneath it.
			// tags:
			//		protected
			var F = "wamc.query._not";
			
			console.debug("wamc.query._not",query);
			
			var e = this._buildExpressions(query);
			
			console.debug(F,"Before negation",e);
			
			// Now negate them
			for(var p in e){
				for (var v in e[p]){
					e[p][v] = "!" + e[p][v];
				}
			}
			
			console.debug(F,"After negation",e);
			
			return e;
		},
		
		_equal:function(/*Object*/query){
			// tags:
			//		protected
			console.debug("wamc.query._equal",query);
			
			var field = query.data[0].data,
				value = query.data[1].data,
				e = {},
				eq = "equal:";
			
			e[field]=[eq + value];
			
			return e;
		},
		
		_startsWith:function(/*Object*/query){
			// tags:
			//		protected
			console.debug("wamc.query._startsWith",query);
			
			var field = query.data[0].data,
				value = query.data[1].data,
				e = {},
				sw ="start:";
			
			e[field]=[sw + value];
			
			return e;
		},
		
		_endsWith:function(/*Object*/query){
			// tags:
			//		protected
			console.debug("wamc.query._endsWith",query);
			
			var field = query.data[0].data,
				value = query.data[1].data,
				e = {},
				ew = "end:";
		
			e[field]=[ew + value];
			
			return e;
		
		return e;
		},
		
		_contains:function(/*Object*/query){
			// tags:
			//		protected
			console.debug("wamc.query._contains",query);
			
			var field = query.data[0].data,
				value = query.data[1].data,
				e = {},
				cn = "contain:";
	
			e[field]=[cn + value];
			
			return e;
		},
		
		_isEmpty:function(/*Object*/query){
			// tags:
			//		protected
			console.debug("wamc.query._isEmpty",query);
			
			var field = query.data[0].data,
				e = {};
	
			e[field]=["empty:"];
			
			return e;
		},
		
		_compressAnyClause:function(/*Object*/query){
			// summary:
			//		Create a 'any column' cause by replacing the property name 
			//		with an asterisk.
			// description:
			//		The query object passed will have properties for all the columns
			//		with the same value. There will also be a 'filterOperator'
			//		property that can be ignored.
			// query:
			//		A query object that has already been translated from the
			//		format passed by the grid
			// return: Object
			//		A new clause object with an asterisk as property name
			
			var nq ={},value=[];
			
			for(var i in query){
				if(i !== "filterOperator"){
					value.concat(query[i]);
					break;
				}
			}
			nq["*"] = value;
			
			return nq;
		}
	};
});
