// Credit to Anders Retteras for adding functionality preventing onblur event to fire on text input when clicking on scrollbars in MSIE / Opera.
// Minified version created at http://jsutility.pjoneil.net/ by running Obfuscation with all options unchecked, and then Compact.
// Packed version created at http://jsutility.pjoneil.net/ by running Compress on the Minified version.

function object(obj){
  var s = function(){};
  s.prototype = obj;
  return new s();
}

var QuickSelect;

(function($){
  // The job of the QuickSelect object is to encapsulate all the state of a select control and manipulate the DOM and interface events.
  QuickSelect = function($input_element, options){
    var self = this;
    $input_element = $($input_element);
    $input_element.attr('autocomplete', 'off');
    self.options = options;

    // Save the state of the control
      // AllItems: hash of "index" -> [items], where index is the query that retrieves or filters the results.
      // clickedLI: just a state variable for IE scrollbars.
      self.AllItems = {};
      var clickedLI = false,
          activeSelection = -1,
          hasFocus = false,
          last_keyCode,
          previous_value,
          timeout,
          ie_stupidity = false,
          $results_list,
          $results_mask;
      if(/MSIE (\d+\.\d+);/.test(navigator.userAgent)){ //test for MSIE x.x;
        if(Number(RegExp.$1) <= 7) ie_stupidity=true;
      }

    // Create the list DOM
      $results_list = $('<div class="'+options.resultsClass+'" style="display:block;position:absolute;z-index:9999;"></div>').hide();
      // Supposedly if we position an iframe behind the results list, before we position the results list, it will hide select elements in IE.
      $results_mask = $('<iframe />');
      $results_mask.css({border:'none',position:'absolute'});
    	if(options.width>0){
    	  $results_list.css("width", options.width);
    	  $results_mask.css("width", options.width);
    	}
    	$('body').append($results_list);
    	$results_list.hide(); // in case for some reason it didn't hide before appending it?
      if(ie_stupidity) $('body').append($results_mask);

    // Set up all of the methods
      self.getLabel = function(item){
        return item.label || (typeof(item)==='string' ? item : item[0]) || ''; // hash:item.label; string:item; array:item[0]
      };
      var getValues = function(item){
        return item.values || (item.value ? [item.value] : (typeof(item)==='string' ? [item] : item)) || []; // hash:item.values || item.value; string:item; array:item[1..end]
      };
     	var moveSelect = function(step_or_li){
    		var lis = $('li', $results_list);
    		if(!lis) return;

     	  if(typeof(step_or_li)==="number") activeSelection = activeSelection + step_or_li;
     	  else activeSelection = lis.index(step_or_li);

    		if(activeSelection < 0) activeSelection = 0;
  		  else if(activeSelection >= lis.size()) activeSelection = lis.size() - 1;

    		lis.removeClass(options.selectedClass);
    		$(lis[activeSelection]).addClass(options.selectedClass);

        if(options.autoFill && self.last_keyCode != 8){ // autoFill value, if option is set and the last user key pressed wasn't backspace
          // 1. Fill in the value (keep the case the user has typed)
      		$input_element.val(previous_value + $(lis[activeSelection]).text().substring(previous_value.length));
      		// 2. SELECT the portion of the value not typed by the user (so the next character will erase if they continue typing)
            var sel_start = previous_value.length,
                sel_end = $input_element.val().length,
                field = $input_element.get(0);
          	if(field.createTextRange){
          		var selRange = field.createTextRange();
          		selRange.collapse(true);
          		selRange.moveStart("character", sel_start);
          		selRange.moveEnd("character", sel_end);
          		selRange.select();
          	} else if(field.setSelectionRange){
          		field.setSelectionRange(sel_start, sel_end);
          	} else if(field.selectionStart){
        			field.selectionStart = sel_start;
        			field.selectionEnd = sel_end;
        		}
          	field.focus();
      	}
    	};
      var hideResultsNow = function(){
        if(timeout){clearTimeout(timeout);}
    		$input_element.removeClass(options.loadingClass);
    		if($results_list.is(":visible")) $results_list.hide();
    		if($results_mask.is(":visible")) $results_mask.hide();
    		activeSelection = -1;
      };
      self.selectItem = function(li, from_hide_now_function){
    		if(!li){
    			li = document.createElement("li");
    			li.item = '';
    		}
        var label = self.getLabel(li.item),
    		    values = getValues(li.item);
    		$input_element.lastSelected = label;
    		$input_element.val(label); // Set the visible value
    		previous_value = label;
    		$results_list.empty(); // clear the results list
        $(options.additionalFields).each(function(i,input){$(input).val(values[i+1]);}); // set the additional fields' values
        if(!from_hide_now_function)hideResultsNow(); // hide the results when something is selected
    		if(options.onItemSelect)setTimeout(function(){ options.onItemSelect(li); }, 1); // run the user callback, if set
    		return true;
      };
      var selectCurrent = function(){
        var li = $("li."+options.selectedClass, $results_list).get(0);
    		if(li){
    			return self.selectItem(li);
    		} else {
          // No current selection - blank the fields if options.exactMatch and current value isn't valid.
          if(options.exactMatch){
            $input_element.val('');
            $(options.additionalFields).each(function(i,input){$(input).val('');});
          }
          return false;
    		}
      };
      var repopulate_items = function(items){
        // Clear the results to begin:
        $results_list.empty();
        // If the field no longer has focus or if there are no matches, forget it.
    		if(!hasFocus || items === null || items.length === 0) return hideResultsNow();
    		
      	var ul = document.createElement("ul"),
      	    total_count = items.length,
        // hover functions
            hf = function(){ moveSelect(this); },
            bf = function(){},
            cf = function(e){ e.preventDefault(); e.stopPropagation(); self.selectItem(this); };
    		$results_list.append(ul);
      	// limited results to a max number
      	if(options.maxVisibleItems > 0 && options.maxVisibleItems < total_count) total_count = options.maxVisibleItems;

        // Add each item:
        for(var i=0; i<total_count; i++){
          var item = items[i],
      		    li = document.createElement("li");
          $results_list.append(li);
    			$(li).text(options.formatItem ? options.formatItem(item, i, total_count) : self.getLabel(item));

          // Save the extra values (if any) to the li
    			li.item = item;
          // Set the class name, if specified
    			if(item.className) li.className = item.className;
      		ul.appendChild(li);
      		$(li).hover(hf, bf).click(cf);
        }

        // Lastly, remove the loading class.
        $input_element.removeClass(options.loadingClass);
        return true;
      };
      var repopulate = function(q,callback){
        options.finderFunction.apply(self,[q,function(data){
          repopulate_items(options.matchMethod.apply(self,[q,data]));
          callback();
        }]);
      };
      var show_results = function(){
      	// pos: get the position of the input field before showing the results_list (in case the DOM is shifted)
      	// iWidth: either use the specified width, or autocalculate based on form element
      	var pos = $input_element.offset(),
      	    iWidth = (options.width > 0 ? options.width : $input_element.width()),
            $lis = $('li', $results_list);
      	// reposition
      	$results_list.css({
      		width: parseInt(iWidth,10) + "px",
      		top: pos.top + $input_element.height() + 5 + "px",
      		left: pos.left + "px"
      	});
      	if(ie_stupidity){$results_mask.css({
      		width: parseInt(iWidth,10) - 2 + "px",
      		top: pos.top + $input_element.height() + 6 + "px",
      		left: pos.left + 1 + "px",
      		height: $results_list.height() - 2+'px'
      	}).show();}
      	$results_list.show();
        // Option autoSelectFirst, and Option selectSingleMatch (activate the first item if only item)
        if(options.autoSelectFirst || (options.selectSingleMatch && $lis.length == 1)) moveSelect($lis.get(0));
      };
      var onChange = function(){
    		// ignore if non-consequence key is pressed (such as shift, ctrl, alt, escape, caps, pg up/down, home, end, arrows)
    		if(last_keyCode >= 9 && last_keyCode <= 45){return;}
        // compare with previous value / store new previous value
    		var q = $input_element.val();
    		if(q == previous_value) return;
    		previous_value = q;
        // if enough characters have been typed, load/populate the list with whatever matches and show the results list.
    		if(q.length >= options.minChars){
    			$input_element.addClass(options.loadingClass);
          // Populate the list, then show the list.
          repopulate(q,show_results);
    		} else { // if too short, hide the list.
    		  if(q.length === 0 && (options.onBlank ? options.onBlank() : true)) // onBlank callback
    		    $(options.additionalFields).each(function(i,input){input.value='';});
    			$input_element.removeClass(options.loadingClass);
    			$results_list.hide();
    			$results_mask.hide();
    		}
      };
      
    // Set up the interface events
      // Mark that actual item was clicked if clicked item was NOT a DIV, so the focus doesn't leave the items.
      $results_list.mousedown(function(e){if(e.srcElement)clickedLI=e.srcElement.tagName!='DIV';});
      $input_element.keydown(function(e){
        last_keyCode = e.keyCode;
        switch(e.keyCode){
          case 38: // Up arrow - select prev item in the drop-down
            e.preventDefault();
            moveSelect(-1);
            break;
          case 40: // Down arrow - select next item in the drop-down
            e.preventDefault();
            if(!$results_list.is(":visible")){
              show_results();
              moveSelect(0);
            }else{moveSelect(1);}
            break;
          case 13: // Enter/Return - select item and stay in field
            if(selectCurrent()){
              e.preventDefault();
              $input_element.select();
            }
            break;
          case 9:  // Tab - select the currently selected, let the onblur happen
            // selectCurrent();
            break;
          case 27: // Esc - deselect any active selection, hide the drop-down but stay in the field
            // Reset the active selection IF must be exactMatch and is not an exact match.
            if(activeSelection > -1 && options.exactMatch && $input_element.val()!=$($('li', $results_list).get(activeSelection)).text()){activeSelection = -1;}
        		$('li', $results_list).removeClass(options.selectedClass);
         	  hideResultsNow();
            e.preventDefault();
            break;
          default:
            if(timeout){clearTimeout(timeout);}
            timeout = setTimeout(onChange, options.delay);
            break;
        }
      }).focus(function(){
    		// track whether the field has focus, we shouldn't process any results if the field no longer has focus
    		hasFocus = true;
    	}).blur(function(e){
        if(activeSelection>-1){selectCurrent();}
    		hasFocus = false;
    		if(timeout){clearTimeout(timeout);}
    		timeout = setTimeout(function(){
    		  hideResultsNow();
          // Select null element, IF options.exactMatch and there is no selection.
          // !! CLEARS THE FIELD IF YOU BLUR AFTER CHOOSING THE ITEM AND RESULTS ARE ALREADY CLOSED!
          if(options.exactMatch && $input_element.val() != $input_element.lastSelected){self.selectItem(null,true);}
    		}, 200);
    	});
  };

  QuickSelect.matchers = {
    quicksilver : function(q,data){
			var match_query, match_label, self=this;
      match_query = (self.options.matchCase ? q : q.toLowerCase());
			self.AllItems[match_query] = [];
      for(var i=0;i<data.length;i++){
        match_label = (self.options.matchCase ? self.getLabel(data[i]) : self.getLabel(data[i]).toLowerCase());
        // Filter by match/no-match
        if(match_label.score(match_query)>0){self.AllItems[match_query].push(data[i]);}
			}
      // Sort by match relevance
			return self.AllItems[match_query].sort(function(a,b){
        // Normalize a & b
        a = (self.options.matchCase ? self.getLabel(a) : self.getLabel(a).toLowerCase());
        b = (self.options.matchCase ? self.getLabel(b) : self.getLabel(b).toLowerCase());
        // Score a & b
    	  a = a.score(match_query);
        b = b.score(match_query);
        // Compare a & b by score
        return(a > b ? -1 : (b > a ? 1 : 0));
      });
    },
    contains : function(q,data){
			var match_query, match_label, self=this;
      match_query = (self.options.matchCase ? q : q.toLowerCase());
      self.AllItems[match_query] = [];
      for(var i=0;i<data.length;i++){
        match_label = (self.options.matchCase ? self.getLabel(data[i]) : self.getLabel(data[i]).toLowerCase());
        if(match_label.indexOf(match_query)>-1){self.AllItems[match_query].push(data[i]);}
      }
			return self.AllItems[match_query].sort(function(a,b){
        // Normalize a & b
        a = (self.options.matchCase ? self.getLabel(a) : self.getLabel(a).toLowerCase());
        b = (self.options.matchCase ? self.getLabel(b) : self.getLabel(b).toLowerCase());
        // Get proximities
        var a_proximity = a.indexOf(match_query);
        var b_proximity = b.indexOf(match_query);
        // Compare a & b by match proximity to beginning of label, secondly alphabetically
        return(a_proximity > b_proximity ? -1 : (a_proximity < b_proximity ? 1 : (a > b ? -1 : (b > a ? 1 : 0))));
      });
    },
    startsWith : function(q,data){
			var match_query, match_label, self=this;
      match_query = (self.options.matchCase ? q : q.toLowerCase());
      self.AllItems[match_query] = [];
      for(var i=0;i<data.length;i++){
        match_label = (self.options.matchCase ? self.getLabel(data[i]) : self.getLabel(data[i]).toLowerCase());
        if(match_label.indexOf(match_query)===0){self.AllItems[match_query].push(data[i]);}
      }
			return self.AllItems[match_query].sort(function(a,b){
        // Normalize a & b
        a = (self.options.matchCase ? self.getLabel(a) : self.getLabel(a).toLowerCase());
        b = (self.options.matchCase ? self.getLabel(b) : self.getLabel(b).toLowerCase());
        // Compare a & b alphabetically
        return(a > b ? -1 : (b > a ? 1 : 0));
      });
    }
  };

  QuickSelect.finders = {
    data : function(q,callback){
      callback(this.options.data);
    },
    ajax  : function(q,callback){
      var url = this.options.ajax + "?q=" + encodeURI(q);
    	for(var i in this.options.ajaxParams){
    	  if(this.options.ajaxParams.hasOwnProperty(i)){
    		  url += "&" + i + "=" + encodeURI(this.options.ajaxParams[i]);
    		}
    	}
      $.getJSON(url, callback);
    }
  };

  $.fn.quickselect = function(options, data){
    if(options == 'instance' && $(this).data('quickselect')) return $(this).data('quickselect');

    // Prepare options and set defaults.
  	options = options || {};
  	options.data          = (typeof(options.data) === "object" && options.data.constructor == Array) ? options.data : undefined;
  	options.ajaxParams    = options.ajaxParams || {};
  	options.delay         = options.delay || 400;
  	if(!options.delay) options.delay = (!options.ajax ? 400 : 10);
  	options.minChars      = options.minChars || 1;
  	options.cssFlavor     = options.cssFlavor || 'quickselect';
  	options.inputClass    = options.inputClass || options.cssFlavor+"_input";
  	options.loadingClass  = options.loadingClass || options.cssFlavor+"_loading";
  	options.resultsClass  = options.resultsClass || options.cssFlavor+"_results";
  	options.selectedClass = options.selectedClass || options.cssFlavor+"_selected";
// wrap entire thing: .ui-widget
// default item:      .ui-state-default
// active / hover:    .ui-state-hover
    // finderFunction: (data | ajax | <custom>)
    options.finderFunction = options.finderFunction || QuickSelect.finders[!options.data ? 'ajax' : 'data'];
    // console.log(options.finderFunction);
      if(options.finderFunction==='data' || options.finderFunction==='ajax') options.finderFunction = QuickSelect.finders[options.finderFunction];
    // console.log(options.finderFunction);
    // matchMethod: (quicksilver | contains | startsWith | <custom>). Defaults to 'quicksilver' if quicksilver.js is loaded / 'contains' otherwise.
    options.matchMethod   = options.matchMethod || QuickSelect.matchers[(typeof(''.score) === 'function' && 'l'.score('l') == 1 ? 'quicksilver' : 'contains')];
      if(options.matchMethod==='quicksilver' || options.matchMethod==='contains' || options.matchMethod==='startsWith') options.matchMethod = QuickSelect.matchers[options.matchMethod];
  	if(options.matchCase === undefined) options.matchCase = false;
  	if(options.exactMatch === undefined) options.exactMatch = false;
  	if(options.autoSelectFirst === undefined) options.autoSelectFirst = true;
  	if(options.selectSingleMatch === undefined) options.selectSingleMatch = true;
  	if(options.additionalFields === undefined) options.additionalFields = $('nothing');
  	options.maxVisibleItems = options.maxVisibleItems || -1;
  	if(options.autoFill === undefined || options.matchMethod != 'startsWith'){options.autoFill = false;} // if you're not using the startsWith match, it really doesn't help to autoFill.
  	options.width         = parseInt(options.width, 10) || 0;
    
    // Make quickselects.
  	return this.each(function(){
  		var input = this,
          my_options = object(options);

      if(input.tagName == 'INPUT'){
        // Text input: ready for QuickSelect-ing!
  	    var qs = new QuickSelect(input, my_options);
  	    $(input).data('quickselect', qs);

  		} else if(input.tagName == 'SELECT'){
        // Select input: transform into Text input, then make QuickSelect.
      	my_options.delay = my_options.delay || 10; // for selects, we know we're not doing ajax, so we might as well speed up
        my_options.finderFunction = 'data';

        // Record the html stuff from the select
        var name = input.name,
            id = input.id,
            className = input.className,
            accesskey = $(input).attr('accesskey'),
            tabindex = $(input).attr('tabindex'),
            selected_option = $("option:selected", input).get(0);

        // Collect the data from the select/options, remove them and create an input box instead.
  		  my_options.data = [];
  		  $('option', input).each(function(i,option){
  		    my_options.data.push({label : $(option).text(), values : [option.value, option.value], className : option.className});
  		  });

        // Create the text input and hidden input
        var text_input = $("<input type='text' class='"+className+"' id='"+id+"_quickselect' accesskey='"+accesskey+"' tabindex='"+tabindex+"' />");
        if(selected_option){text_input.val($(selected_option).text());}
        var hidden_input = $("<input type='hidden' id='"+id+"' name='"+input.name+"' />");
        if(selected_option){hidden_input.val(selected_option.value);}

        // From a select, we need to work off two values, from the label and value of the select options.
        // Record the first (label) in the text input, the second (value) in the hidden input.
        my_options.additionalFields = hidden_input;
        
        // Replace the select with a quickselect text_input
      	$(input).after(text_input).after(hidden_input).remove(); // add text input, hidden input, remove select.
        // console.log(my_options);
      	text_input.quickselect(my_options); // make the text input into a QuickSelect.
      }
    });
  };
})(jQuery);
