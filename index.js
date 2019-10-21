import { createElement, PureComponent } from 'react';
const defaultItemKey = ({ columnIndex, data, rowIndex }) =>
  `${rowIndex}:${columnIndex}`;

export default class GridList extends PureComponent {

  state = {
    instance: this,
    scrollTop: 0,
    scrollUpdateWasRequested: false,
    verticalScrollDirection: 'forward',
    width: 0,
    columnWidth: 0,
    estimatedTotalHeight: 0,
    rowCount: 0
  };

  scrollTo({ scrollTop }) {
    if (scrollTop === undefined) {
      return null;
    }
    let scrollTopMax = Math.max(0, Number(scrollTop));
    this.setState(prevState => {
      if (prevState.scrollTop === scrollTopMax) {
        return null;
      }

      return {
        scrollTop: scrollTopMax,
        scrollUpdateWasRequested: true,
        verticalScrollDirection:
          prevState.scrollTop < scrollTop ? 'forward' : 'backward'
      };
    });
  }

  scrollToItem({ itemIndex }) {
    const { height, rowHeight, columnCount } = this.props;
    const { scrollTop, estimatedTotalHeight, rowCount } = this.state;
    let rowIndex = Math.ceil(itemIndex / columnCount);
    let scrollbarSize = GridList._getScrollbarSize();

    if (rowIndex !== undefined) {
      rowIndex = Math.max(0, Math.min(rowIndex, rowCount - 1));
    }

    scrollbarSize = estimatedTotalHeight > height ? scrollbarSize : 0;
    const lastRowOffset = Math.max(0, rowCount * rowHeight - height);
    const maxOffset = Math.min(lastRowOffset, rowIndex * rowHeight);
    const minOffset = Math.max(
      0,
      rowIndex * rowHeight - height + scrollbarSize + rowHeight
    );

    if (scrollTop >= minOffset && scrollTop <= maxOffset) {
    } else if (minOffset > maxOffset || scrollTop < minOffset) {
      this.scrollTo({ scrollTop: minOffset });
    } else {
      this.scrollTo({ scrollTop: maxOffset });
    }
  }

  constructor(props) {
    super(props);
    const { itemCount, columnCount, rowHeight } = this.props;
    const windowWidth = window.innerWidth;
    this.setState({
      width: windowWidth,
      columnWidth: windowWidth / columnCount,
      rowCount: Math.ceil(itemCount / columnCount),
      estimatedTotalHeight: (Math.ceil(itemCount / columnCount)) * rowHeight
    });
  }

  componentDidMount() {
    const { initialScrollTop } = this.props;
    if (this._outerRef !== null) {
      const outerRef = this._outerRef;
      if (typeof initialScrollTop === 'number') {
        outerRef.scrollTop = initialScrollTop;
      }
    }
  }

  componentDidUpdate() {
    const { scrollTop, scrollUpdateWasRequested } = this.state;

    if (scrollUpdateWasRequested && this._outerRef !== null) {
      const outerRef = this._outerRef;
      outerRef.scrollTop = Math.max(0, scrollTop);
    }
  }

  componentWillUnmount() {
    if (this.timer !== null) {
      this.timer.cancel();
    }
  }

  componentWillReceiveProps(nextProps) {
    const { itemCount, columnCount, rowHeight } = nextProps;
    if (itemCount === this.props.itemCount) {
      return null;
    }
    this.setState({
      rowCount: Math.ceil(itemCount / columnCount),
      estimatedTotalHeight: (Math.ceil(itemCount / columnCount)) * rowHeight
    });
  }

  render() {
    const { children, className, height, columnCount = 3, list, itemCount, itemKey = defaultItemKey } = this.props;
    const { isScrolling, width, estimatedTotalHeight } = this.state;
    const [rowStartIndex, rowStopIndex] = this._getVerticalRangeToRender();
    const items = [];

    if (itemCount) {
      for (
        let rowIndex = rowStartIndex;
        rowIndex <= rowStopIndex;
        rowIndex++
      ) {
        for (
          let columnIndex = 0;
          columnIndex < columnCount;
          columnIndex++
        ) {
          items.push(
            createElement(children, {
              columnIndex,
              data: list,
              isScrolling: undefined,
              key: itemKey({ columnIndex, data: list, rowIndex }),
              rowIndex,
              style: this._getItemStyle(rowIndex, columnIndex)
            })
          );
        }
      }
    }
    return createElement(
      'div',
      {
        className,
        onScroll: this._onScroll,
        ref: this._outerRefSetter,
        style: {
          position: 'relative',
          height,
          width,
          overflow: 'auto',
          WebkitOverflowScrolling: 'touch',
          willChange: 'transform',
        }
      },
      createElement('div', {
        children: items,
        style: {
          height: estimatedTotalHeight,
          pointerEvents: isScrolling ? 'none' : undefined,
          width
        }
      })
    );
  }

  _outerRefSetter = ref => {
    const { outerRef } = this.props;

    this._outerRef = ref;

    if (typeof outerRef === 'function') {
      outerRef(ref);
    }
  };

  _getVerticalRangeToRender() {
    const { overscanRowCount, itemCount, height, rowHeight } = this.props;
    const { isScrolling, verticalScrollDirection, scrollTop, rowCount } = this.state;
    const overscanCountResolved = overscanRowCount || 1;

    if (itemCount === 0) {
      return [0, 0, 0, 0];
    }

    const startIndex = Math.max(0, Math.min(rowCount - 1, Math.floor(scrollTop / rowHeight)));
    const stopIndex = (function () {
      const top = startIndex * rowHeight;
      const numVisibleRows = Math.ceil((height + scrollTop - top) / rowHeight);
      return Math.max(
        0,
        Math.min(
          rowCount - 1,
          startIndex + numVisibleRows - 1
        )
      );
    }());
    const overscanBackward =
      !isScrolling || verticalScrollDirection === 'backward' ?
        Math.max(1, overscanCountResolved) :
        1;
    const overscanForward =
      !isScrolling || verticalScrollDirection === 'forward' ?
        Math.max(1, overscanCountResolved) :
        1;

    return [
      Math.max(0, startIndex - overscanBackward),
      Math.max(0, Math.min(rowCount - 1, stopIndex + overscanForward)),
      startIndex,
      stopIndex
    ];
  }

  _getItemStyle = (rowIndex, columnIndex) => {
    const { columnWidth } = this.state;
    const { rowHeight } = this.props;
    const itemStyleCache = this._getItemStyleCache();
    const key = `${rowIndex}:${columnIndex}`;

    let style;
    if ({}.hasOwnProperty.call(itemStyleCache, key)) {
      style = itemStyleCache[key];
    } else {
      style = {
        position: 'absolute',
        left: columnWidth * columnIndex,
        top: rowHeight * rowIndex,
        height: rowHeight,
        width: columnWidth
      };
      itemStyleCache[key] = style;
    }

    return style;
  };

  static _getScrollbarSize() {
    let size;
    const div = document.createElement('div');
    const { style } = div;
    style.width = '50px';
    style.height = '50px';
    style.overflow = 'scroll';
    document.body.appendChild(div);
    size = div.offsetWidth - div.clientWidth;
    document.body.removeChild(div);
    return size;
  }

  _onScroll = event => {
    const {
      clientHeight,
      scrollTop,
      scrollHeight,
    } = event.currentTarget;
    this.setState(prevState => {
      if (
        prevState.scrollTop === scrollTop
      ) {
        return null;
      }

      const calculatedScrollTop = Math.max(
        0,
        Math.min(scrollTop, scrollHeight - clientHeight)
      );

      return {
        isScrolling: true,
        scrollTop: calculatedScrollTop,
        verticalScrollDirection:
          prevState.scrollTop < scrollTop ? 'forward' : 'backward',
        scrollUpdateWasRequested: false
      };
    });
  };

  memoizeOne(resultFn) {
    const isEqual = function (newInputs, lastInputs) {
      if (newInputs.length !== lastInputs.length) {
        return false;
      }
      for (let i = 0; i < newInputs.length; i++) {
        if (newInputs[i] !== lastInputs[i]) {
          return false;
        }
      }
      return true;
    };
    let lastThis, lastResult;
    let lastArgs = [];
    let calledOnce = false;

    function memoized() {
      let newArgs = [];
      for (let _i = 0; _i < arguments.length; _i++) {
        newArgs[_i] = arguments[_i];
      }
      if (calledOnce && lastThis === this && isEqual(newArgs, lastArgs)) {
        return lastResult;
      }
      lastResult = resultFn.apply(this, newArgs);
      calledOnce = true;
      lastThis = this;
      lastArgs = newArgs;
      return lastResult;
    }

    return memoized;
  }

  _getItemStyleCache = this.memoizeOne((_, __, ___) => ({}));
}

