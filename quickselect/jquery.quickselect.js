// TODO:  (PUT CHANGES ALSO IN PACKED VERSION!!)
//   X) Add list choice formatting option
//   2) Copy the id also to the text_input, but with _quickselect appended.
//   3) Copy accesskey and tabindex to the text_input
//   4) Copy [tab] code to onblur callback
(function($){
  $.fn.indexOf = function(e){
  	for( var i=0; i<this.length; i++){
  		if(this[i] == e) return i;
  	}
  	return -1;
  };

  function Populater(mode){
    this.populate = function(value){
      var that = this;
    	if(!this.that.options.matchCase) value = value.toLowerCase();
    	var data = this.that.cacheLength ? this.that.loadFromCache(value) : null;
      if(data){
        this.that.populate_list(value, data);
    	}else{
        this.get_data(value, function(data){
          if(data) that.that.populate_list(value, data);
            else $(that.that.text_input).removeClass(that.that.options.loadingClass);
        });
    	}
    };
  }

  function AjaxPopulate(that){
    this.that = that;
    var ajax = this;
    this.get_data = function(value, callback){
      $.getJSON(makeUrl(value), function(data){
        callback(ajax.importData(value, data));
      });
    };

    this.importData = function(value, data){
			this.that.addToCache(value, data);
			return data;
    };

    function makeUrl(q){
    	var url = that.options.url + "?q=" + encodeURI(q);
    	for (var i in that.options.extraParams){
    		url += "&" + i + "=" + encodeURI(that.options.extraParams[i]);
    	}
    	return url;
    };
  }
  AjaxPopulate.prototype = new Populater('ajax');

  function DataPopulate(that){
    this.that = that;
    this.get_data = function(value, callback){
    	if(!this.that.options.data) callback();
    	else{
        var rows = [], row = [];

    	  // create a lookup by first letter.
    		for(var i=0; i < this.that.options.data.length; i++){
    			row = ((typeof this.that.options.data[i] == "string") ? [this.that.options.data[i]] : this.that.options.data[i]); // make sure each element is an array
  				rows.push(row);                        // add row to blank lookup
    		}
    		// add the data items to the cache
        this.that.cacheLength++;
  			this.that.addToCache('', rows);

    		callback(this.that.loadFromCache(value));
    	};
    };
  }
  DataPopulate.prototype = new Populater('data');

  // The QuickSelect Functions...
  function QuickSelectPrototype(){
    this.flushCache = function(){
  		this.cache = {data:{},length:0};
  	};
  	this.addToCache = function(q, data){
  		if(!data || !this.cacheLength) return;
  		if(!this.cache.length || this.cache.length > this.cacheLength){
  			this.flushCache();
  			this.cache.length++;
  		} else if(!this.cache[q]){
  			this.cache.length++;
  		}
  		this.cache.data[q] = data;
  	};
    this.loadFromCache = function(q){
    	if(!q) return null;
    	if(this.cache.data[q]) return this.cache.data[q];
    	for (var i = q.length - 1; i >= 0; i--){
    		var qs = q.substr(0, i);
    		var c = this.cache.data[qs];
    		if(c){
    			var csub = [];
    			for (var j = 0; j < c.length; j++){
    				var x = c[j];
    				var x0 = x[0];
    				if(this.findMatch(this.options.match, x0, q)) csub[csub.length] = x;
    			}
    			return csub.sort(sortMatches(this.options.match, q));
    		}
    	}
    	return null;
    };

    this.findMatch = function(mode, str, sub){
    	if(!this.options.matchCase) str = str.toLowerCase();
      switch(mode){
        case 'substring':
        	var i = str.indexOf(sub);
        	if(i == -1) return false;
        	return i == 0 || this.options.matchContains;
        case 'quicksilver':
      	  return str.score(sub) > 0;
      };
    };

    function sortMatches(mode, sub){
      switch(mode){
        case 'substring':
          return function(a,b){
            var c = [a[0],b[0]].sort;
            return (a[0] == c[0]) - (b[0] == c[1]);
          };
        case 'quicksilver':
          return function(a,b){
        	  var as = a[0].toLowerCase().score(sub);
            var bs = b[0].toLowerCase().score(sub);
            return(as > bs ? -1 : (bs > as ? 1 : 0));
          };
      };
    };

   	this.moveSelect = function(step){
  		var lis = $("li", this.results);
  		if(!lis)return;

  		this.active += step;

  		if(this.active < 0)this.active = 0;
  		  else if(this.active >= lis.size())
  		    this.active = lis.size() - 1;

  		lis.removeClass(this.options.selectedClass);
  		$(lis[this.active]).addClass(this.options.selectedClass);
  	};

  	this.selectCurrent = function(){
  		var li = $("li."+this.options.selectedClass, this.results)[0];
  		if(li){
  			this.selectItem(li);
  			return true;
  		} else {
        // blank the fields if options.mustMatch and current value isn't valid.
        if(this.options.mustMatch && this.loadFromCache(this.$text_input.val().toLowerCase()).length == 0)
  		    this.options.additional_fields.each(function(i,input){
            $(input).val('');
          });
  			return false;
  		}
  	};

  	this.selectItem = function(li,from_hide_now_function){
      var that = this;

  		if(!li){
  			li = document.createElement("li");
  			li.values = [];
  		}
      var v = $.trim(li.values[0] || li.innerHTML);
  		this.text_input.lastSelected = $.trim(li.values[0] || li.innerHTML);
      // TODO: debug whether this should be the $.trim'd version or not.
  		this.previous_value = v;
  		this.$results.html("");
  		
      this.options.additional_fields.each(function(i,input){
        $(input).val(li.values[i]);
      });
      if(!from_hide_now_function)
        this.hideResultsNow();
  		if(this.options.onItemSelect) setTimeout(function(){ that.options.onItemSelect(li) }, 1);
  	};

    this.showResults = function(){
    	// get the position of the input field right now (in case the DOM is shifted)
    	var pos = findPos(this.text_input);
    	// either use the specified width, or autocalculate based on form element
    	var iWidth = (this.options.width > 0) ? this.options.width : this.$text_input.width();
    	// reposition
    	this.$results.css({
    		width: parseInt(iWidth) + "px",
    		top: (pos.y + this.text_input.offsetHeight) + "px",
    		left: pos.x + "px"
    	}).show();
    };

    function findPos(obj){
    	var curleft = obj.offsetLeft || 0;
    	var curtop = obj.offsetTop || 0;
    	while (obj = obj.offsetParent){
    		curleft += obj.offsetLeft
    		curtop += obj.offsetTop
    	}
    	return {x:curleft,y:curtop};
    }

  	this.hideResults = function(){
  	  var that = this;
  		if(this.timeout) clearTimeout(this.timeout);
  		this.timeout = setTimeout(function(){that.hideResultsNow()}, 200);
  	};

  	this.hideResultsNow = function(){
  		if(this.timeout)
  		  clearTimeout(this.timeout);
  		this.$text_input.removeClass(this.options.loadingClass);
  		if(this.$results.is(":visible"))
  		  this.$results.hide();
			if(this.options.mustMatch && this.$text_input.val() != this.text_input.lastSelected)
			  this.selectItem(null,true);
  	};

  	this.onChange = function(){
  		// ignore if the following keys are pressed: [del] [shift] [capslock]
  		if(this.last_keyCode == 46 || (this.last_keyCode > 8 && this.last_keyCode < 32)) return this.$results.hide();
  		var v = this.$text_input.val();
  		if(v == this.previous_value)return;
  		this.previous_value = v;
  		if(v.length >= this.options.minChars){
  			this.$text_input.addClass(this.options.loadingClass);
        this.populater.populate(v);
  		} else {
  		  if((this.options.onBlank && this.options.onBlank()) || true){ // onBlank callback
  		    this.options.additional_fields.each(function(i,input){
            $(input).val('');
          });
  		  }
        
  			this.$text_input.removeClass(this.options.loadingClass);
  			this.$results.hide();
  		}
  	};

    this.autoFill = function(str){
    	// if the last user key pressed was backspace, don't autofill
    	if(this.last_keyCode != 8){
    		// fill in the value (keep the case the user has typed)
    		this.$text_input.val(this.$text_input.val() + str.substring(this.previous_value.length));
    		// select the portion of the value not typed by the user (so the next character will erase)
    		createSelection(this, this.previous_value.length, str.length);
    	}
    };

    function createSelection(that, start, end){
    	// get a reference to the input element
    	var field = $(that.text_input).get(0);
    	if(field.createTextRange){
    		var selRange = field.createTextRange();
    		selRange.collapse(true);
    		selRange.moveStart("character", start);
    		selRange.moveEnd("character", end);
    		selRange.select();
    	} else if(field.setSelectionRange){
    		field.setSelectionRange(start, end);
    	} else {
    		if(field.selectionStart){
    			field.selectionStart = start;
    			field.selectionEnd = end;
    		}
    	}
    	field.focus();
    };

    this.populater = function(mode){
      if(mode == 'ajax') return new AjaxPopulate(this);
      if(mode == 'data') return new DataPopulate(this);
    };

    this.populate_list = function(q, data){
    	if(data){
    		this.$text_input.removeClass(this.options.loadingClass);
    		this.results.innerHTML = "";

    		// if the field no longer has focus or if there are no matches, do not display the drop down
    		if(!this.hasFocus || data.length == 0) return this.hideResultsNow();

    		this.results.appendChild(dataToDom(data, this));
    		if(this.options.autoFill && (this.$text_input.val().toLowerCase() == q.toLowerCase())) this.autoFill(data[0][0]); // autoFill the typing box, if option allows
    		this.showResults();
  			if(this.options.autoSelectFirst || (this.options.selectOnly && data.length == 1)) this.moveSelect(0); // selects current selection or top listing if none, if option allows
    	} else {
    		this.hideResultsNow();
    	}
    };

    function dataToDom(data, that){
    	var ul = document.createElement("ul");

    	var num = data.length;
    	// limited results to a max number
    	if((that.options.maxItemsToShow > 0) && (that.options.maxItemsToShow < num)) num = that.options.maxItemsToShow;

    	for (var i=0; i < num; i++){
    		var row = data[i];
    		if(!row) continue;
    		var li = document.createElement("li");
  			li.innerHTML = that.options.formatItem ? that.options.formatItem(row, i, num) : row[0];
    		var values = [];
  			for(var j=0; j < row.length; j++){
  				values[values.length] = row[j];
  			}
    		li.values = values;
    		ul.appendChild(li);
    		$(li).hover(
    			function(){ $("li", ul).removeClass(that.options.selectedClass); $(this).addClass(that.options.selectedClass); that.active = $("li", ul).indexOf($(this).get(0)) },
    			function(){ $(this).removeClass(that.options.selectedClass) }
    		).click(function(e){ e.preventDefault(); e.stopPropagation(); that.selectItem(this) });
    	}
    	return ul;
    };
  }

  // The QuickSelect Maker...
  function QuickSelect(text_input, options){
    var that = this;
    this.text_input = text_input; // make public
    this.options = options; // make public
  	text_input.quickselector = this;

  	// Create jQuery object for input element.
    var $text_input = $(text_input).attr("quickselect", "off");
    this.$text_input = $text_input;

  	// Apply inputClass if necessary.
  	if(options.inputClass) $text_input.addClass(options.inputClass);

  	// Create results.
  	var results = document.createElement("div");
  	this.results = results; // make public
  	this.$results = $(results);

  	// Create jQuery object for results.
  	var $results = $(results);
  	$results.hide().addClass(options.resultsClass).css("position", "absolute");
  	if(options.width > 0) $results.css("width", options.width);

  	// Add to body element.
  	$("body").append(results);

    // Initialize the cache
  	this.flushCache();

    // Attach the action!
  	this.active = -1;
  	this.previous_value = '';
  	this.timeout = null;
  	this.last_keyCode = null;
  	
    $text_input
  	.keydown(function(e){
  		that.last_keyCode = e.keyCode;
  		switch(e.keyCode){
  			case 38: // up arrow - select prev item in the drop-down
  				e.preventDefault();
  				that.moveSelect(-1);
  				break;
  			case 40: // down arrow - select next item in the drop-down
  				e.preventDefault();
  				that.moveSelect(1);
  				break;
  			case 13: // return - select item and blur field
  				if(that.selectCurrent()){
  					e.preventDefault();
  					$text_input.get(0).select();
  				}
  				break;
  			case 9:  // tab - select the currently selected, let the regular stuff happen
  			  that.selectCurrent();
  			default:
  				that.active = 0;
  				if(that.timeout) clearTimeout(that.timeout);
  				that.timeout = setTimeout(function(){that.onChange()}, options.delay);
  				break;
  		}
  	})
  	.focus(function(){
  		// track whether the field has focus, we shouldn't process any results if the field no longer has focus
  		that.hasFocus = true;
  	})
  	.blur(function(){
  		// track whether the field has focus
  		that.hasFocus = false;
  		that.hideResults();
  	});

    this.cacheLength = 1;
    this.populater = this.populater(options.url ? 'ajax' : 'data');

  	this.hideResultsNow();
  };
  QuickSelect.prototype = new QuickSelectPrototype();

  // Make the quickselect form control...
  $.fn.quickselect = function(options, data){
    // Prepare options and set defaults.
  	options = options || {};
  	options.url           = options.url || options.ajax;
  	options.extraParams   = options.extraParams || {};
  	options.data          = ((typeof options.data == "object") && (options.data.constructor == Array)) ? options.data : null;
  	options.minChars      = options.minChars || 1;
  	options.inputClass    = options.inputClass || "auto_select_input";
  	options.loadingClass  = options.loadingClass || "auto_select_loading";
  	options.resultsClass  = options.resultsClass || "auto_select_results";
  	options.selectedClass = options.selectedClass || "auto_select_selected";
    options.match         = options.match || ((typeof ''.score == 'function') && 'l'.score('l') == 1 ? 'quicksilver' : 'substring');
  	options.matchContains = options.matchContains || false;
  	options.autoSelectFirst = options.autoSelectFirst || true;
  	options.selectOnly    = options.selectOnly || true;
  	options.maxItemsToShow = options.maxItemsToShow || -1;
  	options.autoFill      = options.autoFill || false;
      if(options.match == 'quicksilver') options.autoFill = false; // if you're using the quicksilver match, it really doesn't help to autoFill.
  	options.width         = parseInt(options.width, 10) || 0;

    // Make quickselects.
  	this.each(function(){
  		var input = this;
        var shadow_options = function(){};
        shadow_options.prototype = options; // now a new instance of shadow "is a" options
      var my_options = new shadow_options();

  	  if(input.tagName == 'INPUT'){
      	my_options.delay         = my_options.delay || 400;
      	my_options.matchCase     = my_options.matchCase || false;
      	my_options.mustMatch     = my_options.mustMatch || false;
      	my_options.additional_fields = $(input).add(my_options.additional_fields);

  	    new QuickSelect(input, my_options);
  		} else if(input.tagName == 'SELECT'){
      	my_options.delay         = my_options.delay || 10; // for selects, we know we're not doing ajax, so we might as well speed up
      	my_options.matchCase     = my_options.matchCase || false;
      	my_options.mustMatch     = my_options.mustMatch || true;

        // Collect the data from the select/options, remove them and create an input box instead.
  		  var $select = $(input);
  		  my_options.data = [];
    		  $select.find('option').each(function(i,option){
    		    my_options.data[i] = [option.innerHTML, option.value];
    		  });

        // Record the html stuff from the select
        var name = $select[0].name;
        var id = $select[0].id;
        var className = $select[0].className;

        var selected = $select.find("option:selected")[0];

        // Create the text input and hidden input
        var text_input = document.createElement("input");
        text_input.type = 'text';
      	text_input.className = className;
      	if(selected) text_input.value = selected.innerHTML;
      
        var hidden_input = document.createElement("input");
        hidden_input.type = 'hidden';
      	hidden_input.id = id;
        hidden_input.name = $select[0].name;
      	if(selected) hidden_input.value = selected.value;

        // We need to work off two values, from the label and value of the select options.
        // Record the first (label) in the text input, the second (value) in the hidden input.
        my_options.additional_fields = $(hidden_input);
        
        // Replace the select with a quickselect text_input
      	$select.after(text_input).after(hidden_input).remove();
      	$(text_input).quickselect(my_options);
      }
  	});
  };
})(jQuery);
