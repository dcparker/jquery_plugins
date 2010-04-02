(function($){
  $.fn.range_selector = function(options){
    var $widget = $(this);
    $widget[0].range_selector = $widget;

    $widget.complete = function(){
      var from_index = $widget.down_on, to_index = $widget.up_on;
      if(from_index > to_index){
        var j = to_index;
        to_index = from_index;
        from_index = j;
      }
      $widget.selectRange(from_index, to_index);
      $widget.down_on = null;
      $widget.up_on = null;
      window[options.callback_name].apply($widget, [from_index, to_index]);
    };
    $widget.selectTo = function(to_index){
      if($widget.down_on != null)
        $widget.selectRange($widget.down_on, parseInt(to_index,10));
    };
    $widget.selectRange = function(from_index, to_index){
      if(from_index > to_index){
        var j = to_index;
        to_index = from_index;
        from_index = j;
      }
      if(!from_index && from_index != 0) from_index = 0;
      if(!to_index && to_index != 0) to_index = parseInt($widget.find('li:last').attr('data-index'),10);

      var i,item_index;
      $widget.find('li').each(function(i,item){
        item_index = parseInt($(item).attr('data-index'),10);
        if(item_index >= from_index && item_index <= to_index)
          $(item).addClass('selected');
        else
          $(item).removeClass('selected');
        if(item_index == from_index) $(item).addClass('first');
        else $(item).removeClass('first');
        if(item_index == to_index) $(item).addClass('last');
        else $(item).removeClass('last');
      });
    };
    $widget.selectNone = function(){
      $widget.find('li').removeClass('selected');
    };

    $widget._cancelling_timeouts = [];
    $widget.scheduleCancel = function(){
      var t = setTimeout(function(){
        if(!$widget._completed){
          $widget.down_on = null;
          $widget.up_on = null;
          window[options.cancel_callback_name].apply($widget);
        }
      },600);
      $widget._cancelling_timeouts.push(t);
    };

    // Makes a simple drag-selector
    $widget.find('li').mousedown(function(e){
      var item_index = $(this).attr('data-index');
      $widget.find('li').removeClass('selected');
      $widget.down_on = parseInt(item_index,10);
      $widget._completed = false;
      e.preventDefault();
    }).mouseup(function(){
      var item_index = $(this).attr('data-index');
      if($widget.down_on != null){
        $widget.up_on = parseInt(item_index,10);
        $widget._completed = true;
        $widget.complete();
      }
    }).mouseover(function(e){
      var item_index = $(this).attr('data-index');
      $widget.selectTo(item_index);
    });

    // Cancel when you leave the area
    $widget.mouseout(function(){
      $widget.scheduleCancel();
    });
    $widget.mouseover(function(){
      clearTimeout($widget._cancelling_timeouts.shift());
    });

    if(options.init) window[options.init].apply($widget, []);
  };
})(jQuery);
