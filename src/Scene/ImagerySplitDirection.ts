enum ImagerySplitDirection {
    /**
     * Display the ImageryLayer to the left of the {@link Scene#imagerySplitPosition}.
     *
     * @type {Number}
     * @constant
     */
    LEFT = -1.0,

    /**
     *  Always display the ImageryLayer.
     *
     * @type {Number}
     * @constant
     */
    NONE = 0.0,

    /**
     * Display the ImageryLayer to the right of the {@link Scene#imagerySplitPosition}.
     *
     * @type {Number}
     * @constant
     */
    RIGHT = 1.0,
}

export default ImagerySplitDirection;
