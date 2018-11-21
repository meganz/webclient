$(document).ready(function() {
    var VIEW_MODES = {
        'GRID': 1,
        'CAROUSEL': 2,
    };

    var DUMMY = [
        // {
        //     'avatar': 'http://via.placeholder.com/620x465'
        // },
        {
            'avatar': '../_tmp/sample.mkv'
        },
        // {
        //     'avatar': '../_tmp/sample.mkv'
        // },
        // {
        //     'avatar': '../_tmp/sample.mkv'
        // },
        // {
        //     'avatar': 'http://via.placeholder.com/320x480'
        // },
        // {
        //     'avatar': 'http://via.placeholder.com/480x320'
        // },
        // {
        //     'avatar': 'http://via.placeholder.com/640x360'
        // },
        // {
        //     'avatar': '../_tmp/sample.mkv'
        // }
    ];

    var $container = $('.groupcallContainer');
    var $ul = $('ul', $container);

    DUMMY.forEach(function(session) {
        if (session.avatar.indexOf(".mkv") > -1) {
            $ul.append(
                '<li><video src="' + session.avatar + '" autoplay="true" /></li>'
            );
        }
        else {
            $ul.append(
                '<li><img src="' + session.avatar + '" /></li>'
            );
        }
    });

    var GroupCallView = function($container) {
        this.$container = $container;
        this.$ul = $('ul', $container);
    };

    GroupCallView.prototype.resize = function() {
        var self = this;

        self.$container.height(
            $(window).innerHeight()
        );

        var w = Math.min($(self.$container).height(), $(self.$container).width()) / DUMMY.length;
        $('li', this.$container).each(function(k, elem) {
            var $media = $('video, img', elem);
            var $elem = $(elem);
            var w2;
            var h2;

            if ($media.is("video")) {
                w2 = $media[0].videoWidth;
                h2 = $media[0].videoHeight;
            }
            else if ($media.is("img")) {
                w2 = $media[0].naturalWidth;
                h2 = $media[0].naturalHeight;
            }
            else {
                console.error("TODO!");
                $media
                    .css({
                        'width': 'auto',
                        'height': 'auto'
                    });

                w2 = $media.outerWidth();
                h2 = $media.outerHeight();
            }
            // console.error($media[0].tagName, w2, h2);

            if (w2 > 0 && h2 > 0) {
                // use the bigger side
                var fw = w2 < h2 ? w2 : h2;
                if (fw > w) {
                    fw = w;
                }

                $media
                    .width(fw)
                    .height(fw);
            }
            else {
                $media.one('load', function() {
                    self.resize();
                })
            }

            $elem.width(w)
                .height(w);

        });
    };

    GroupCallView.prototype.destroy = function() {

    };


    var gcv = new GroupCallView($container);
    gcv.resize();
    $(window).on('resize', gcv.resize.bind(gcv));
});
