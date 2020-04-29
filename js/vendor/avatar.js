(function(window) {

/**
 * Functions from Underscore.js 1.4.4
 * http://underscorejs.org
 * (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
 * Underscore may be freely distributed under the MIT license.
 */
var _ = {
    bind: function _Bind(ctx) {
        return (function(){}).bind.apply(ctx, [].slice.call(arguments, 1));
    },
    bindAll: function _bindAll(obj) {
        [].slice.call(arguments, 1).forEach(function(f) {
            obj[f] = _.bind(obj[f], obj);
        });
    },
    each: function _each(obj, iterator, context) {
        obj.forEach(iterator, context);
    },
    filter: function _filter(obj, iterator, context) {
        return [].slice.call(obj).filter(iterator, context);
    },
    first: function _first(array, n, guard) {
        if (array == null) {
            return void 0;
        }
        return (n != null) && !guard ? array.slice(0, n) : array[0];
    },
    has: function _has(obj, prop) {
        return obj.hasOwnProperty(prop);
    },
    isFunction: function _isFunction(func) {
        return typeof func === 'function';
    },
    isRegExp: function _isRegExp(obj) {
        return Object.prototype.toString.call(obj) === '[object RegExp]';
    }
};

/**
 * Avatar Picker
 * https://bitbucket.org/atlassianlabs/avatar-picker/src
 * A combination of the JS source files required for the avatar picker to work.
 * Built with command:
 * cat canvas-cropper.js <(echo) client-file-handler.js <(echo) client-file-reader.js <(echo) drag-drop-file-target.js <(echo) upload-interceptor.js <(echo) image-explorer.js <(echo) image-upload-and-crop.js > avatar-picker.js
 */
window.CanvasCropper = (function(){
    function CanvasCropper(width, height){
        if (!CanvasCropper.isSupported()) {
            throw new Error("This browser doesn't support CanvasCropper.");
        }
        return this.init.apply(this, arguments);
    }

    var supportsCanvas = (function() {
        var canvas = document.createElement('canvas');
        return (typeof canvas.getContext === 'function') && canvas.getContext('2d');
    }());

    CanvasCropper.isSupported = function() {
        return supportsCanvas;
    };

    CanvasCropper.prototype.defaults = {
        outputFormat: 'image/jpeg',
        backgroundFillColor: undefined
    };

    CanvasCropper.prototype.init = function(width, height, opts) {
        this.width = width;
        this.height = height || width; //Allow single param for square crop
        this.options = $.extend({}, this.defaults, opts);
        this.canvas = $('<canvas/>')
            .attr('width', this.width)
            .attr('height', this.height)
            [0];
        return this;
    };

    CanvasCropper.prototype.cropToDataURI = function(image, sourceX, sourceY, cropWidth, cropHeight) {
        return this
                .crop(image, sourceX, sourceY, cropWidth, cropHeight)
                .getDataURI(this.options.outputFormat);
    };

    CanvasCropper.prototype.crop = function(image, sourceX, sourceY, cropWidth, cropHeight) {
        var context = this.canvas.getContext('2d'),
            targetX = 0,
            targetY = 0,
            targetWidth = this.width,
            targetHeight = this.height;

        context.clearRect(targetX, targetY, targetWidth, targetHeight);

        if (this.options.backgroundFillColor) {
            context.fillStyle = this.options.backgroundFillColor;
            context.fillRect(targetX, targetY, targetWidth, targetHeight);
        }

        /*
         *** Negative sourceX or sourceY ***
         context.drawImage can't accept negative values for source co-ordinates,
         but what you probably meant is you want to do something like the below

         |-------------------|
         |                   |
         |   CROP AREA       |
         |                   |
         |        |----------|----------------|
         |        |          |                |
         |        |          |   IMAGE        |
         |        |          |                |
         |-------------------|                |
                  |                           |
                  |                           |
                  |                           |
                  |                           |
                  |---------------------------|

         We need to do a couple of things to make that work.
         1. Set the target position to the proportional location of the source position
         2. Set source co-ordinates to 0
         */

        if (sourceX < 0) {
            targetX = Math.round((Math.abs(sourceX) / cropWidth) * targetWidth);
            sourceX = 0;
        }

        if (sourceY < 0) {
            targetY = Math.round((Math.abs(sourceY) / cropHeight) * targetHeight);
            sourceY = 0;
        }

        /*
         *** source co-ordinate + cropSize > image size ***
         context.drawImage can't accept a source co-ordinate and a crop size where their sum
         is greater than the image size. Again, below is probably what you wanted to achieve.


         |---------------------------|
         |                           |
         |       IMAGE               |
         |                           |
         |                           |
         |               |-----------|-------|
         |               |           |       |
         |               |     X     |       |
         |               |           |       |
         |---------------|-----------|       |
                         |                   |
                         |   CROP AREA       |
                         |                   |
                         |-------------------|

         We need to do a couple of things to make that work also.
         1. Work out the size of the actual image area to be cropped (X).
         2. Get the proportional size of the target based on the above
         3. Set the crop size to the actual crop size.
         */

        if (sourceX + cropWidth > image.naturalWidth) {
            var newCropWidth = image.naturalWidth - sourceX;
            targetWidth *= newCropWidth / cropWidth;
            cropWidth = newCropWidth;
        }

        if (sourceY + cropHeight > image.naturalHeight) {
            var newCropHeight = image.naturalHeight - sourceY;
            targetHeight *= newCropHeight / cropHeight;
            cropHeight = newCropHeight;
        }

        context.drawImage(
            image,
            sourceX,
            sourceY,
            cropWidth,
            cropHeight,
            targetX,
            targetY,
            targetWidth,
            targetHeight
        );

        return this;
    };

    CanvasCropper.prototype.getDataURI = function(outputFormat) {
        if (outputFormat) { //TODO: Check if in array of valid mime types
            return this.canvas.toDataURL(outputFormat, 0.75);
        } else {
            return null;
        }
    };

    return CanvasCropper;
})();

window.ClientFileHandler = (function(){

    function ClientFileHandler(opts){
        return this.init(opts);
    }

    ClientFileHandler.typeFilters = {
        all: /.*/,
        application: /^application\/.*/,
        audio: /^audio\/.*/,
        image: /^image\/.*/,
        imageWeb: /^image\/(jpeg|png|gif)$/,
        text: /^text\/.*/,
        video: /^video\/.*/
    };

    ClientFileHandler.prototype.defaults = {
        fileTypeFilter: ClientFileHandler.typeFilters.all, //specify a regex or use one of the built in typeFilters
        fileCountLimit: Infinity, //How many files can a user upload at once? This will limit it to the first n files,
        fileSizeLimit: 20 * 1024 * 1024, //Maximum file size in bytes (20MB per file),
        onSuccess: $.noop,
        onError: $.noop
    };

    ClientFileHandler.prototype.init = function(opts){
        this.options = $.extend({}, this.defaults, opts);

        if (opts && !opts.fileSizeLimit) {
            this.options.fileSizeLimit = this.defaults.fileSizeLimit;
        }
        if (opts && !opts.fileCountLimit) {
            this.options.fileCountLimit = this.defaults.fileCountLimit;
        }

        _.bindAll(this, 'handleFiles', 'filterFiles');

        return this;
    };

    /**
     * Takes in an array of files, processes them, and fires the onSuccess handler if any are valid, or the onError handler
     * otherwise. These handlers can be specified on the options object passed to the constructor.
     * @param fileList array of objects like { size:Number, type:String }
     * @param fileSourceElem - Unused. Matches IframeUploader interface\
     * @param event - event to check user drop a folder
     */
    ClientFileHandler.prototype.handleFiles = function(fileList, fileSourceElem, event){
        //Assumes any number of files > 0 is a success, else it's an error
        var filteredFiles = this.filterFiles(fileList, event);

        if (filteredFiles.valid.length > 0) {
            //There was at least one valid file
            _.isFunction(this.options.onSuccess) && this.options.onSuccess(filteredFiles.valid);
        } else {
            //there were no valid files added
            _.isFunction(this.options.onError) && this.options.onError(filteredFiles.invalid);
        }
    };

    ClientFileHandler.prototype.filterFiles = function(fileList, event){
        var fileTypeFilter = _.isRegExp(this.options.fileTypeFilter) ? this.options.fileTypeFilter : this.defaults.fileTypeFilter,
            fileSizeLimit = this.options.fileSizeLimit,
            invalid = {
                byType: [],
                bySize: [],
                byCount: []
            },
            valid = _.filter(fileList, function(file){

                if (M.checkFolderDrop(event)) {
                    invalid.byType.push(file);
                    return false;
                }

                if (!fileTypeFilter.test(file.type)) {
                    invalid.byType.push(file);
                    return false;
                }

                if (file.size > fileSizeLimit) {
                    invalid.bySize.push(file);
                    return false;
                }

                return true;
            });

        if (valid.length > this.options.fileCountLimit) {
            invalid.byCount = valid.slice(this.options.fileCountLimit);
            valid = valid.slice(0, this.options.fileCountLimit);
        }

        return {
            valid: valid,
            invalid: invalid
        };
    };

    return ClientFileHandler;

})();

window.ClientFileReader = (function(){

    var fileReaderSupport = !!(window.File && window.FileList && window.FileReader);

    var _readMethodMap = {
        ArrayBuffer : 'readAsArrayBuffer',
        BinaryString: 'readAsBinaryString',
        DataURL : 'readAsDataURL',
        Text : 'readAsText'
    };

    function ClientFileReader(opts){
        if (!ClientFileReader.isSupported()) {
            throw new Error("ClientFileReader requires FileReaderAPI support");
        }
        return this.init(opts);
    }

    ClientFileReader.isSupported = function() {
        return fileReaderSupport;
    };

    $.extend(ClientFileReader.prototype, ClientFileHandler.prototype);



    ClientFileReader.readMethods = {
        ArrayBuffer : 'ArrayBuffer',
        BinaryString: 'BinaryString',
        DataURL : 'DataURL',
        Text : 'Text'
    };

    ClientFileReader.typeFilters = ClientFileHandler.typeFilters; //Expose this to the calling code

    ClientFileReader.prototype.defaults = $.extend({}, ClientFileHandler.prototype.defaults, {
        readMethod: ClientFileReader.readMethods.DataURL,
        onRead: $.noop
    });

    ClientFileReader.prototype.init = function(opts) {
        _.bindAll(this, 'onSuccess', 'readFile');
        ClientFileHandler.prototype.init.call(this, opts);

        this.options.onSuccess = this.onSuccess; //We don't want this to be optional.
        return this;
    };

    ClientFileReader.prototype.onSuccess = function(files) {
        var readMethod = _.has(_readMethodMap, this.options.readMethod) ? _readMethodMap[this.options.readMethod] : undefined;

        if (readMethod) {
            _.each(files, _.bind(function(file){
                var fileReader = new FileReader();
                fileReader.onload = _.bind(this.readFile, this, file); //pass the file handle to allow callback access to filename, size, etc.
                fileReader[readMethod](file);
            }, this));
        }
    };

    ClientFileReader.prototype.readFile = function(file, fileReaderEvent){
        _.isFunction(this.options.onRead) && this.options.onRead(fileReaderEvent.target.result, file);
    };

    return ClientFileReader;
})();

window.DragDropFileTarget = (function(){

    function DragDropFileTarget(el, opts){
        return this.init.apply(this, arguments);
    }

    DragDropFileTarget.prototype.getDefaults = function() {
        return {
            activeDropTargetClass: 'active-drop-target',
            uploadPrompt: 'Drag a file here to upload',
            clientFileHandler: null
        };
    };

    DragDropFileTarget.prototype.init = function(el, opts){
        _.bindAll(this, 'onDragOver', 'onDragEnd', 'onDrop');

        this.$target = $(el);
        this.options = $.extend({}, this.getDefaults(), opts);

        this.$target.attr('data-upload-prompt', this.options.uploadPrompt);

        //bind drag & drop events
        this.$target.on('dragover', this.onDragOver);
        this.$target.on('dragleave', this.onDragEnd);
        this.$target.on('dragend', this.onDragEnd);
        this.$target.on('drop', this.onDrop);
    };

    DragDropFileTarget.prototype.onDragOver = function(e){
        e.preventDefault();
        this.$target.addClass(this.options.activeDropTargetClass);
    };

    DragDropFileTarget.prototype.onDragEnd = function(e){
        e.preventDefault();
        this.$target.removeClass(this.options.activeDropTargetClass);
    };

    DragDropFileTarget.prototype.onDrop = function(e){
        e.preventDefault();
        e.originalEvent.preventDefault();

        this.$target.removeClass(this.options.activeDropTargetClass);

        if (this.options.clientFileHandler) {
            this.options.clientFileHandler.handleFiles(e.originalEvent.dataTransfer.files, e.originalEvent.target, e);
        }
    };

    return DragDropFileTarget;
})();
window.UploadInterceptor = (function(){

    function UploadInterceptor(el, opts){
        return this.init.apply(this, arguments);
    }

    UploadInterceptor.prototype.defaults = {
        replacementEl: undefined,
        clientFileHandler: null
    };

    UploadInterceptor.prototype.init = function(el, opts) {
        _.bindAll(this, 'onSelectFile', 'onReplacementClick');

        this.$el = $(el);
        this.options = $.extend({}, this.defaults, opts);

        this.$el.on('change', this.onSelectFile);

        if (this.options.replacementEl) {
            this.$replacement = $(this.options.replacementEl);
            this.$el.hide();

            // IE marks a file input as compromised if has a click triggered programmatically
            // and this prevents you from later submitting it's form via Javascript.
            // The work around is to use a label as the replacementEl with the `for` set to the file input,
            // but it requires that the click handler below not be bound. So regardless of whether you want
            // to use the workaround or not, the handler should not be bound in IE.
            if ($.browser && $.browser.msie) {
                if (!this.$replacement.is('label')) {
                    // Workaround is not being used, fallback to showing the regular file element and hide the replacement
                    this.$replacement.hide();
                    this.$el.show();
                }
            } else {
                this.$replacement.on('click', this.onReplacementClick);
            }
        }
    };

    UploadInterceptor.prototype.onSelectFile = function(e){
        if ($(e.target).val() && this.options.clientFileHandler) {
            this.options.clientFileHandler.handleFiles(e.target.files, this.$el, e);
        }
    };

    UploadInterceptor.prototype.onReplacementClick = function(e){
        e.preventDefault();
        this.$el.click();
    };

    UploadInterceptor.prototype.destroy = function(){
        this.$el.off('change', this.onSelectFile);
        this.$replacement.off('click', this.onReplacementClick);
    };

    return UploadInterceptor;
})();
window.ImageExplorer = (function(){

    function ImageExplorer($container, opts){
        this.init.apply(this, arguments);
    }

    ImageExplorer.scaleModes = {
        fill: 'fill',
        contain: 'contain',
        containAndFill: 'containAndFill'
    };

    ImageExplorer.zoomModes = {
        localZoom: 'localZoom', //Keep the area under the mask centered so you zoom further in on the same location.
        imageZoom: 'imageZoom' //Keep the image centered in its current location, so unless the image is centered under the mask, the area under the mask will change.
    };

    ImageExplorer.prototype.defaults = {
        initialScaleMode: ImageExplorer.scaleModes.fill,
        zoomMode: ImageExplorer.zoomModes.localZoom,
        emptyClass: 'empty',
        scaleMax: 1 //Maximum image size is 100% (is overridden by whatever the initial scale is calculated to be)
    };

    ImageExplorer.prototype.init = function($container, opts){
        this.$container      = $container;
        this.$imageView      = this.$container.find('.image-explorer-image-view');
        this.$sourceImage    = this.$container.find('.image-explorer-source');
        this.$mask           = this.$container.find('.image-explorer-mask');
        this.$dragDelegate   = this.$container.find('.image-explorer-drag-delegate');
        this.$scaleSlider    = this.$container.find('.image-explorer-scale-slider');
        this.options         = $.extend({}, this.defaults, opts);
        this.imageProperties = {};

        _.bindAll(this, 'getImageSrc', 'setImageSrc', 'initImage', 'initDragDelegate', 'initScaleSlider', 'setInitialScale',
            'getFillScale', 'getContainedScale', 'getCircularContainedScale', 'sliderValToScale', 'scaleToSliderVal',
            'updateImageScale', 'resetImagePosition', 'resetScaleSlider', 'toggleEmpty', 'get$ImageView', 'get$SourceImage',
            'get$Mask', 'get$DragDelegate', 'getMaskedImageProperties', 'showError', 'clearError', 'hasValidImage',
            '_resetFromError', '_removeError');

        this.toggleEmpty(true); //assume the explorer is empty initially and override below if otherwise

        if (this.$sourceImage[0].naturalWidth) {
            //The image has already loaded (most likely because the src was specified in the html),
            //so remove the empty class and call initImage passing through a fake event object with the target
            this.toggleEmpty(false);

            this.initImage({
                target:this.$sourceImage[0]
            });
        }

        this.$sourceImage.on('load', this.initImage);

        this.initScaleSlider();
        this.initDragDelegate();
    };

    ImageExplorer.prototype.getImageSrc = function(){
        return (this.$sourceImage) ? this.$sourceImage.attr('src') : undefined;
    };

    ImageExplorer.prototype.setImageSrc = function(src){
        if (this.$sourceImage) {
            this.$sourceImage.attr('src', '').attr('src', src); //Force image to reset if the user uploads the same image
        }
    };

    ImageExplorer.prototype.initImage = function(e){
        var image = e.target;
        this.imageProperties.naturalWidth = image.naturalWidth;
        this.imageProperties.naturalHeight = image.naturalHeight;

        this._removeError();
        this.toggleEmpty(false);
        this.setInitialScale();
    };

    ImageExplorer.prototype.initDragDelegate = function(){
        var imageOffset;

        this.$dragDelegate.draggable({
            start: _.bind(function(){
                imageOffset = this.$sourceImage.offset();
            }, this),
            drag: _.bind(function(e, ui){
                this.$sourceImage.offset({
                    top: imageOffset.top + ui.position.top - ui.originalPosition.top,
                    left: imageOffset.left + ui.position.left - ui.originalPosition.left
                });
            }, this)
        });
    };

    ImageExplorer.prototype.initScaleSlider = function() {
        this.$scaleSlider.on('change', _.bind(function(e) {
            this.updateImageScale(this.sliderValToScale(e.target.value));
        }, this));
        this.$scaleSlider.prev().on('click', _.bind(function() {
            this.$scaleSlider.val(parseInt(this.$scaleSlider.val()) - 10);
            this.updateImageScale(this.sliderValToScale(this.$scaleSlider.val()));
        }, this));
        this.$scaleSlider.next().on('click', _.bind(function() {
            this.$scaleSlider.val(parseInt(this.$scaleSlider.val()) + 10);
            this.updateImageScale(this.sliderValToScale(this.$scaleSlider.val()));
        }, this));
    };

    ImageExplorer.prototype.setInitialScale = function(){
        var maskWidth = this.$mask.width(),
            maskHeight =this.$mask.height(),
            naturalWidth = this.imageProperties.naturalWidth,
            naturalHeight = this.imageProperties.naturalHeight,
            initialScale = 1;

        this.minScale = 1;

        switch(this.options.initialScaleMode) {
            case ImageExplorer.scaleModes.fill:
                //sets the scale of the image to the smallest size possible that completely fills the mask.
                this.minScale = initialScale = this.getFillScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
            break;

            case ImageExplorer.scaleModes.contain:
                //Sets the scale of the image so that the entire image is visible inside the mask.
                if (this.$mask.hasClass('circle-mask')) {
                    this.minScale = initialScale = this.getCircularContainedScale(naturalWidth, naturalHeight, maskWidth / 2);
                } else {
                    this.minScale = initialScale = this.getContainedScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
                }
            break;

            case ImageExplorer.scaleModes.containAndFill:
                //Set the min scale so that the lower bound is the same as scaleModes.contain, but the initial scale is scaleModes.fill
                if (this.$mask.hasClass('circle-mask')) {
                    this.minScale = this.getCircularContainedScale(naturalWidth, naturalHeight, maskWidth / 2);
                } else {
                    this.minScale = this.getContainedScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
                }

                initialScale = this.getFillScale(naturalWidth, naturalHeight, maskWidth, maskHeight);
            break;
        }

        this.maxScale = Math.max(initialScale, this.options.scaleMax);
        this.resetScaleSlider(this.scaleToSliderVal(initialScale));
        //Always use ImageExplorer.zoomModes.imageZoom when setting the initial scale to center the image.
        this.updateImageScale(initialScale, ImageExplorer.zoomModes.imageZoom);
        this.resetImagePosition();
    };

    ImageExplorer.prototype.getFillScale = function(imageWidth, imageHeight, constraintWidth, constraintHeight){
        var widthRatio = constraintWidth / imageWidth,
            heightRatio = constraintHeight / imageHeight;
        return Math.max(widthRatio, heightRatio);
    };

    ImageExplorer.prototype.getContainedScale = function(imageWidth, imageHeight, constraintWidth, constraintHeight){
        var widthRatio = constraintWidth / imageWidth,
            heightRatio = constraintHeight / imageHeight;
        return Math.min(widthRatio, heightRatio);
    };

    ImageExplorer.prototype.getCircularContainedScale = function(imageWidth, imageHeight, constraintRadius){
        var theta = Math.atan(imageHeight / imageWidth),
            scaledWidth = Math.cos(theta) * constraintRadius * 2;
            //Math.cos(theta) * constraintRadius gives the width from the centre of the circle to one edge so we need to double it.
        return scaledWidth / imageWidth;
    };

    ImageExplorer.prototype.sliderValToScale = function(sliderValue) {
        var sliderValAsUnitInterval = sliderValue / (this.$scaleSlider.attr('max') - this.$scaleSlider.attr('min'));
        //http://math.stackexchange.com/questions/2489/is-there-a-name-for-0-1 (was tempted to use sliderValAsWombatNumber)
        return this.minScale + (sliderValAsUnitInterval * (this.maxScale - this.minScale));
    };

    ImageExplorer.prototype.scaleToSliderVal = function(scale) {
        //Slider represents the range between maxScale and minScale, normalised as a percent (the HTML slider range is 0-100).
        var sliderValAsUnitInterval = (scale - this.minScale) / (this.maxScale - this.minScale);

        return sliderValAsUnitInterval * (this.$scaleSlider.attr('max') - this.$scaleSlider.attr('min'));
    };

    ImageExplorer.prototype.updateImageScale = function(newScale, zoomMode){
        var newWidth = Math.round(newScale * this.imageProperties.naturalWidth),
            newHeight = Math.round(newScale * this.imageProperties.naturalHeight),
            newMarginLeft,
            newMarginTop;

        zoomMode = zoomMode || this.options.zoomMode;

        switch (zoomMode) {
            case ImageExplorer.zoomModes.imageZoom:
                newMarginLeft = -1 * newWidth / 2;
                newMarginTop = -1 * newHeight / 2;
            break;

            case ImageExplorer.zoomModes.localZoom:
                var oldWidth = this.$sourceImage.width(),
                    oldHeight = this.$sourceImage.height(),
                    oldMarginLeft = parseInt(this.$sourceImage.css('margin-left'), 10),
                    oldMarginTop = parseInt(this.$sourceImage.css('margin-top'), 10),
                    sourceImagePosition = this.$sourceImage.position(), //Position top & left only. Doesn't take into account margins
                    imageViewCenterX = this.$imageView.width() / 2,
                    imageViewCenterY = this.$imageView.height() / 2,
                    //Which pixel is currently in the center of the mask? (assumes the mask is centered in the $imageView)
                    oldImageFocusX = imageViewCenterX - sourceImagePosition.left - oldMarginLeft,
                    oldImageFocusY = imageViewCenterY - sourceImagePosition.top - oldMarginTop,
                    //Where will that pixel be once the image is resized?
                    newImageFocusX = (oldImageFocusX / oldWidth) * newWidth,
                    newImageFocusY = (oldImageFocusY / oldHeight) * newHeight;

                //How many pixels do we need to shift the image to put the new focused pixel in the center of the mask?
                newMarginLeft = imageViewCenterX - sourceImagePosition.left - newImageFocusX;
                newMarginTop = imageViewCenterY - sourceImagePosition.top - newImageFocusY;
            break;
        }

        this.$sourceImage.add(this.$dragDelegate)
            .width(newWidth)
            .height(newHeight)
            .css({
                'margin-left': Math.round(newMarginLeft) +'px',
                'margin-top': Math.round(newMarginTop) +'px'
            });
            var x1 = this.$mask.offset().left + this.$mask.width() - newMarginLeft - newWidth;
            var y1 = this.$mask.offset().top + this.$mask.height() - newMarginTop - newHeight;
            var x2 = this.$mask.offset().left - newMarginLeft;
            var y2 = this.$mask.offset().top - newMarginTop;

        this.$dragDelegate.draggable('option', 'containment', [x1, y1, x2, y2]);
    };


    ImageExplorer.prototype.resetImagePosition = function(){
        this.$sourceImage.add(this.$dragDelegate).css({
            top: '50%',
            left: '50%'
        });
    };

    ImageExplorer.prototype.resetScaleSlider = function(initialValue){
        this.$scaleSlider
                .val(initialValue)
                .removeClass('disabled')
                .removeAttr('disabled');
    };

    ImageExplorer.prototype.toggleEmpty = function(toggle) {
        this.$container.toggleClass(this.options.emptyClass, toggle);
    };

    ImageExplorer.prototype.get$ImageView = function(){
        return this.$imageView;
    };

    ImageExplorer.prototype.get$SourceImage = function(){
        return this.$sourceImage;
    };

    ImageExplorer.prototype.get$Mask = function(){
        return this.$mask;
    };

    ImageExplorer.prototype.get$DragDelegate = function(){
        return this.$dragDelegate;
    };

    ImageExplorer.prototype.getMaskedImageProperties = function(){
        var currentScaleX = this.$sourceImage.width() / this.imageProperties.naturalWidth,
            currentScaleY = this.$sourceImage.height() / this.imageProperties.naturalHeight,
            maskPosition = this.$mask.position(),
            imagePosition = this.$sourceImage.position();

            maskPosition.top += parseInt(this.$mask.css('margin-top'), 10);
            maskPosition.left += parseInt(this.$mask.css('margin-left'), 10);

            imagePosition.top += parseInt(this.$sourceImage.css('margin-top'), 10);
            imagePosition.left += parseInt(this.$sourceImage.css('margin-left'), 10);

        return {
            maskedAreaImageX : Math.round((maskPosition.left - imagePosition.left) / currentScaleX),
            maskedAreaImageY : Math.round((maskPosition.top - imagePosition.top) / currentScaleY),
            maskedAreaWidth  : Math.round(this.$mask.width() / currentScaleX),
            maskedAreaHeight : Math.round(this.$mask.height() / currentScaleY)
        };
    };

    ImageExplorer.prototype.showError = function(title, contents) {
        this._removeError();
        this.toggleEmpty(true);

        alert(title + ' ' + contents);
    };

    ImageExplorer.prototype.clearError = function() {
        this._removeError();
        this._resetFromError();
    };

    ImageExplorer.prototype.hasValidImage = function(){
        return !!(this.getImageSrc() && this.$sourceImage.prop('naturalWidth'));
    };

    ImageExplorer.prototype._resetFromError = function(){
        // When the error is closed/removed, if there was a valid img in the explorer, show that,
        // otherwise keep displaying the 'empty' view
        // Might also need to do something in the caller (e.g. ImageUploadAndCrop) so fire an optional callback.
        var hasValidImage = this.hasValidImage();
        this.toggleEmpty(!hasValidImage);
        this.$container.removeClass('error');
        _.isFunction(this.options.onErrorReset) && this.options.onErrorReset(hasValidImage ? this.getImageSrc() : undefined);
    };

    ImageExplorer.prototype._removeError = function(){
        this.$imageView.find('.aui-message.error').remove();
    };

    return ImageExplorer;
})();
window.ImageUploadAndCrop = (function(){

    function ImageUploadAndCrop($container, opts){
        if (!ImageUploadAndCrop.isSupported()) {
            throw new Error("This browser doesn't support ImageUploadAndCrop.");
        }
        this.init.apply(this, arguments);
    }

    ImageUploadAndCrop.isSupported = function() {
        return CanvasCropper.isSupported();
    };

    ImageUploadAndCrop.prototype.defaults = {
        HiDPIMultiplier: 2,  //The canvas crop size is multiplied by this to support HiDPI screens
        dragDropUploadPrompt: l[1390],
        onImageUpload: $.noop,
        onImageUploadError: $.noop,
        onCrop: $.noop,
        outputFormat: 'image/png',
        fallbackUploadOptions: {},
        initialScaleMode: ImageExplorer.scaleModes.fill,
        scaleMax: 1,
        fileSizeLimit: 15 * 1024 * 1024, //5MB
        maxImageDimension: 5000 //In pixels
    };

    ImageUploadAndCrop.prototype.init = function($container, opts){
        this.options = $.extend({}, this.defaults, opts);
        this.$container = $container;

        _.bindAll(this, 'crop', 'resetState', '_onFileProcessed', 'setImageSrc', 'validateImageResolution', '_onFilesError',
            '_onFileError', '_resetFileUploadField', '_onErrorReset');

        this.imageExplorer = new ImageExplorer(this.$container.find('.image-explorer-container'), {
            initialScaleMode: this.options.initialScaleMode,
            scaleMax: this.options.scaleMax,
            onErrorReset: this._onErrorReset
        });

        if (ClientFileReader.isSupported()) {
            this.clientFileReader = new ClientFileReader({
                readMethod: 'ArrayBuffer',
                onRead: this._onFileProcessed,
                onError: this._onFilesError,
                fileTypeFilter: ClientFileReader.typeFilters.imageWeb,
                fileCountLimit: 1,
                fileSizeLimit: this.options.fileSizeLimit
            });

            //drag drop uploading is only possible in browsers that support the fileReaderAPI
            this.dragDropFileTarget = new DragDropFileTarget(this.imageExplorer.get$ImageView(), {
                uploadPrompt: this.options.dragDropUploadPrompt,
                clientFileHandler: this.clientFileReader
            });
        } else {
            //Fallback for older browsers. TODO: Client side filetype filtering?

            this.$container.addClass("filereader-unsupported");

            var fallbackOptions = $.extend({
                onUpload: this._onFileProcessed,
                onError: this._onFileError
            }, this.options.fallbackUploadOptions);

            this.clientFileReader = new ClientFileIframeUploader(fallbackOptions);
        }

        this.uploadIntercepter = new UploadInterceptor(this.$container.find('.image-upload-field'), {
            replacementEl: this.$container.find('.image-upload-field-replacement'),
            clientFileHandler: this.clientFileReader
        });

        var mask = this.imageExplorer.get$Mask();

        this.canvasCroppper = new CanvasCropper(
            250,
            250,
            //mask.width() * this.options.HiDPIMultiplier,
            //mask.height() * this.options.HiDPIMultiplier,
            {
                outputFormat: this.options.outputFormat
            }
        );

        this.options.cropButton && $(this.options.cropButton).click(this.crop);
    };

    ImageUploadAndCrop.prototype.crop = function(){
        var cropProperties = this.imageExplorer.getMaskedImageProperties(),
            croppedDataURI = this.canvasCroppper.cropToDataURI(
                this.imageExplorer.get$SourceImage()[0],
                cropProperties.maskedAreaImageX,
                cropProperties.maskedAreaImageY,
                cropProperties.maskedAreaWidth,
                cropProperties.maskedAreaHeight
            );

        _.isFunction(this.options.onCrop) && this.options.onCrop(croppedDataURI);
    };

    ImageUploadAndCrop.prototype.resetState = function(){
        this.imageExplorer.clearError();
        this._resetFileUploadField();
    };

    ImageUploadAndCrop.prototype._onFileProcessed = function(imageData) {
        if (!imageData || !imageData.byteLength) {
            return this._onFileProcessed2(imageData);
        }

        var self = this;
        var img = new Image();
        img.onload = img.onerror = function() {
            self._onFileProcessed2(this.src);

            if (exifImageRotation.fromImage) {
                document.body.removeChild(img);
            }
        };
        if (exifImageRotation.fromImage) {
            img.style.imageOrientation = 'none';
            document.body.appendChild(img);
        }

        var orientation = 1;
        onIdle(function() {
            exifImageRotation(img, imageData, orientation);
        });
        orientation = EXIF.readFromArrayBuffer(imageData).Orientation;
    };

    ImageUploadAndCrop.prototype._onFileProcessed2 = function(imageSrc){
        if (imageSrc){
            if (!isNaN(this.options.maxImageDimension)) {
                var validatePromise = this.validateImageResolution(imageSrc);

                validatePromise
                    .done(_.bind(function(imageWidth, imageHeight){
                        this.setImageSrc(imageSrc);
                    }, this))
                    .fail(_.bind(function(imageWidth, imageHeight){
                        this._onFileError('The selected image size is ' + imageWidth + 'px * ' + imageHeight + 'px. The maximum allowed image size is ' + this.options.maxImageDimension +
                            'px * ' + this.options.maxImageDimension + 'px');
                    }, this));
            } else {
                // If imageResolutionMax isn't valid, skip the validation and just set the image src.
                this.setImageSrc(imageSrc);
            }
        } else {
            this._onFileError();
        }
    };

    ImageUploadAndCrop.prototype.setImageSrc = function(imageSrc) {
        this.imageExplorer.setImageSrc(imageSrc);
        _.isFunction(this.options.onImageUpload) && this.options.onImageUpload(imageSrc);
        this._resetFileUploadField();
    };

    ImageUploadAndCrop.prototype.validateImageResolution = function(imageSrc){
        var validatePromise = $.Deferred(),
            tmpImage = new Image(),
            self = this;

        tmpImage.onload = function(){
            if (this.naturalWidth > self.options.maxImageDimension ||  this.naturalHeight > self.options.maxImageDimension) {
                validatePromise.reject(this.naturalWidth, this.naturalHeight);
            } else {
                validatePromise.resolve(this.naturalWidth, this.naturalHeight);
            }
        };

        tmpImage.src = imageSrc;

        return validatePromise;
    };

    ImageUploadAndCrop.prototype._onFilesError = function(invalidFiles) {
        // Work out the most appropriate error to display. Because drag and drop uploading can accept multiple files and we can't restrict this,
        // it's not an all or nothing situation, we need to try and find the most correct file and base the error on that.
        // If there was at least 1 valid file, then this wouldn't be called, so we don't need to worry about files rejected because of the fileCountLimit

        if (invalidFiles && invalidFiles.bySize && invalidFiles.bySize.length){
            //Some image files of the correct type were filtered because they were too big. Pick the first one to use as an example.
            var file = _.first(invalidFiles.bySize);
            this._onFileError('File "' + str_mtrunc(file.name, 50) + '" is ' + bytesToSize(file.size) +
                ' which is larger than the maximum allowed size of ' + bytesToSize(this.options.fileSizeLimit));
        } else {
            //No files of the correct type were uploaded. The default error message will cover this.
            this._onFileError();
        }
    };

    ImageUploadAndCrop.prototype._onFileError = function(error){
        var title = 'There was an error uploading your image',
            contents = error || 'Please check that your file is a valid image and try again.';

        this.imageExplorer.showError(title, contents);
        this._resetFileUploadField();
        _.isFunction(this.options.onImageUploadError) && this.options.onImageUploadError(error);
    };

    ImageUploadAndCrop.prototype._resetFileUploadField = function(){
        //clear out the fileUpload field so the user could select the same file again to "reset" the imageExplorer
        var form = this.$container.find("#image-upload-and-crop-upload-field").prop('form');
        form && form.reset();
    };

    ImageUploadAndCrop.prototype._onErrorReset = function(imgSrc){
        //If we have a valid image after resetting from the error, notify the calling code.
        if (imgSrc) {
            _.isFunction(this.options.onImageUpload) && this.options.onImageUpload(imgSrc);
        }
    };

    return ImageUploadAndCrop;
})();
})(this);
