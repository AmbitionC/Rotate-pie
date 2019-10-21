/*
 * author: Hao Chen
 * description: zoom the data-intensive area
 */

const Util = require('../util/common');
const Interaction = require('./base');
const Chart = require('../chart/chart');

class PieZoom extends Interaction {
    // 获取基本配置参数
    getDefaultCfg() {
        let defaultCfg = super.getDefaultCfg();
        defaultCfg = Util.mix({}, defaultCfg, {
            // 默认设置
            startEvent: 'tap',
            processEvent: null,
            animate: false,
            zoomFunction: false,
            dataSource: null,
        });
        // 微信&小程序适配
        if (Util.isWx || Util.isMy) {
            defaultCfg.startEvent = 'touchstart';
            defaultCfg.endEvent = 'touchend';
        }
        return defaultCfg;
    }

    constructor(cfg, chart) {
        super(cfg, chart);
        let zoomedData;
        let zoomedFlag = false;
        let animating = false;
    }

    // 重新绘制图表
    _repaintChart(angle) {
        const chartCoord = this.chart.get('coord');
        const coordStart = chartCoord.startAngle + angle;
        const coordEnd = chartCoord.endAngle + angle;
        this.chart.animate(false);
        this.chart.coord('polar', {
            transposed: true,
            radius: 0.8,
            startAngle: coordStart,
            endAngle: coordEnd
        });
        this.chart.pieLabel({
            lineStyle: {
                opacity: 0
            },
            anchorStyle: {
                opacity: 0
            }
        });
        this.chart.source(this.dataSource); 
        this.chart.repaint();
    }

    // 改变底部的Legend
    _changeLegend(tapShape) {
        let targetShape = tapShape;
        const legend = this.chart.get('legendController').legends.bottom[0];
        legend.items[0].name = targetShape.get('origin')._origin.name;
        legend.items[0].value = targetShape.get('origin')._origin.proportion;
        let legendMarkerStyle = {
            symbol: 'square',
            fill: targetShape.get('origin').color,
            radius: 4
        }
        legend.items[0].marker = legendMarkerStyle;
    }

    // 获取点击的元素，以及指腹覆盖的范围
    _getTapShapeByData(data) {
        const geom = this.chart.get('geoms')[0];
        const container = geom.get('container');
        const children = container.get('children');
        let selectedShape = null;
        Util.each(children, child => {
            if (child.get('isShape') && (child.get('className') === geom.get('type'))) {
                const shapeData = child.get('origin')._origin;
                if (Util.isObjectValueEqual(shapeData, data)) {
                    selectedShape = child;
                    return false;
                }
            }
        });
        return selectedShape;
    }

    _getTapShapes(e) {
        const chart = this.chart;
        if (e.type === 'tap') {
            e.clientX = e.center.x;
            e.clientY = e.center.y;
        };
        const { x, y } = Util.createEvent(e, chart);
        const records = chart.getSnapRecords({ x, y });
        if (!records.length) return;
        const data = records[0]._origin;
        const tapShape = this._getTapShapeByData(data);
        return tapShape;
    }

    // 根据点击的元素，旋转到底部
    _slideToMiddle(angle, animateConfig) {
        const geom = this.chart.get('geoms')[0];
        const container = geom.get('container');
        const center = this.chart.get('coord').center;
        let angleFromBottom = Math.PI / 2 - angle;
        let diff = function(t) {
            return angleFromBottom * t
        };
        if (angleFromBottom !== 0) {
            container.animate().to(animateConfig).onFrame((t) => {
                this.animating = true;
                let frameAngle = diff(t);
                container.setTransform([
                    ['t', center.x, center.y],
                    ['r', frameAngle],
                    ['t', -center.x, -center.y]
                ]);
                if (t === 1) {
                    this.animating = false;
                    this._repaintChart(angleFromBottom);
                }
            })
        }
    } 

    _rotateTapShapeToBottom(tapShape) { 
        const startAngle = tapShape.attr('startAngle');
        const endAngle = tapShape.attr('endAngle');
        let middleAngle = (startAngle + endAngle) / 2;
        if (startAngle > endAngle && endAngle <= 0) {
            middleAngle = (Math.PI * 2 - Math.abs(startAngle - endAngle)) / 2 + startAngle;
            if (middleAngle > 1.5 * Math.PI) {
                middleAngle = middleAngle - 2 * Math.PI;
            }
        }
        this._slideToMiddle(middleAngle, {
            duration: 350,
            easing: 'backOut'
        });
        this._changeLegend(tapShape);
    }

    // 根据点击的位置，计算周边数据密集区的大小
    _createRandomPoints(range) {  // 产生点击区域周围range范围的随机点
        return Math.floor(Math.random() * (Math.random() > 0.5 ? 1 : -1) * range)
    }

    _getShapeByPoint(point) {
        const pointAxis = { x: point[0], y: point[1] };
        const pointRecord = this.chart.getSnapRecords(pointAxis)[0];
        if (pointRecord !== undefined) {
            const pointShape = this._getTapShapeByData(pointRecord._origin);
            return pointShape
        }else {
            return undefined;
        }
    }

    _getTapAreaShapes(e, accuracy) {
        const tapCenter = e.center;
        let tapShape = [this._getShapeByPoint([tapCenter.x, tapCenter.y])];
        let randomAxis;
        for (let i = 0; i < accuracy; i ++) {
            randomAxis = [tapCenter.x + this._createRandomPoints(20), tapCenter.y + this._createRandomPoints(20)];
            tapShape.push(this._getShapeByPoint(randomAxis));
        }
        tapShape = Array.from(new Set(tapShape));
        let newTapShape = [];
        tapShape.forEach((item) => {
            if (item !== undefined) {
                newTapShape.push(item);
            }
        });
        return newTapShape;
    } 

    // 获取点击区域的名字
    _getTapAreaNames(shapes) {
        let names = [];
        for (let i = 0; i < shapes.length; i ++) {
            let shapeName = shapes[i]._attrs.origin._origin.name;
            if (shapeName) {
                names.push(shapeName)
            }
        }
        return names;
    }

    // 计算数据密集区是否符合条件
    _caculateZoomArea(tapAreaNames) {
        const geom = this.chart.get('geoms')[0];
        const container = geom.get('container');
        const children = container.get('children');
        let proportionAll = 0;
        let tapAreaProportion = 0;
        children.forEach((item) => {
            let childProportion = item.get('origin')._origin.proportion;
            let childName = item.get('origin')._origin.name;
            if (childProportion && childName) {
                proportionAll += childProportion;
            }
            for (let i = 0; i < tapAreaNames.length; i ++) {
                if (childName === tapAreaNames[i]) {
                    tapAreaProportion += childProportion;
                }
            }
        });
        if (tapAreaNames.length < 2 || tapAreaProportion > (proportionAll / 2)) {
            return false;
        }else {
            return true;
        }
    }

    // 对数据密集区的元素进行高亮
    _getUnselectedShapes(tapAreaShapes, allShapes) {
        return tapAreaShapes.concat(allShapes).filter((v, i, arr) => {
            return arr.indexOf(v) === arr.lastIndexOf(v);
        })
    }

    _highlightZoomArea(tapAreaShapes) {
        const geom = this.chart.get('geoms')[0];
        const allShapes = geom.get('container').get('children');
        let canvas = this.chart.get('canvas');
        const unTapAreaShapes = this._getUnselectedShapes(tapAreaShapes, allShapes);
        if (unTapAreaShapes) {
            Util.each(unTapAreaShapes, function(s) {
                s.attr("fillOpacity", 0.18)
            });
            Util.each(tapAreaShapes, function(s) {
                s.attr("lineWidth", 1.5)
            })
        }
        canvas.draw();
    }

    // 对放大区改变图形元素效果

    // 方案一：重新渲染整个饼图
    _clearLegend() {
        const legend = chart.get('legendController').legends.bottom[0];
        legend.items[0].name = null;
        legend.items[0].proportion = null;
        legend.items[0].marker = null;        
    }

    _repaintZoomedArea1(tapAreaNames) {
        this.zoomedData = [];
        Util.deepMix(this.zoomedData, this.dataSource);
        let tapAreaFlag;
        for (let i = 0; i < this.dataSource.length; i ++) {
            tapAreaFlag = false;
            for (let j = 0; j < tapAreaNames.length; j ++) {
                if (this.dataSource[i].name === tapAreaNames[j]) {
                    tapAreaFlag = true;
                }
            }
            if (!tapAreaFlag) {
                this.zoomedData[i].a = null;
                this.zoomedData[i].proportion = null;
            }
        }
        // 根据匹配到的数据来重新绘制图表
        this.chart.coord('polar', {
            transposed: true,
            radius: 0.8,
            innerRadius: 0.3,
        });
        this.chart.pieLabel({
            sidePadding: 90,
            activeShape: false,
            label1: function label1(data) {
                return {
                    text: data.name + ": " + data.proportion,
                    fill: '#343434',
                    fontWeight: 'bold'
                };
            }
        });
        this.chart.animate(true);
        this.chart.source(this.zoomedData);
        this.chart.repaint();
        this.zoomedFlag = true;
    }

    // 回到未缩放的状态
    _findShapeByName(name) {
        const geom = this.chart.get('geoms')[0];
        const allShapes = geom.get('container').get('children');
        let resultShape;
        Util.each(allShapes, (shape) => {
            let everyShapeName = shape.get('origin')._origin.name;
            if (everyShapeName === name) {
                resultShape = shape;
            }
        });
        return resultShape
    }

    _unzoomTheChart(tapShapeName) {
        this._repaintChart(0);
        let tapShapeAfterZoom = this._findShapeByName(tapShapeName);
        this._rotateTapShapeToBottom(tapShapeAfterZoom);
        this.zoomedFlag = false;
    }

    start(ev) {
        const tapShape = this._getTapShapes(ev);
        if (!this.zoomFunction && tapShape !== undefined) {
            // 不开启数据密集区放大功能
            this._rotateTapShapeToBottom(tapShape);
        }else if (this.zoomFunction && tapShape !== undefined) {
            // 开启数据密集区放大功能
            let tapAreaShapes = this._getTapAreaShapes(ev, 100);
            let tapAreaNames = this._getTapAreaNames(tapAreaShapes);
            const needZoomFlag = this._caculateZoomArea(tapAreaNames)
            if (!needZoomFlag && !this.zoomedFlag) {
                // 点击的区域不符合数据数据密集区，不需要放大
                // 直接旋转
                this._highlightZoomArea(tapAreaShapes);
                setTimeout(() => {
                    this._rotateTapShapeToBottom(tapShape);
                }, 500);
            } else if (needZoomFlag && !this.zoomedFlag) {
                // 点击的区域符合数据密集区，且处于未放大状态
                // 将数据密集区高亮
                this._highlightZoomArea(tapAreaShapes);
                // 改变图形元素
                setTimeout(() => {
                    this._repaintZoomedArea1(tapAreaNames);
                }, 800)
            } else if (this.zoomedFlag) {
                // 如果处于放大情况下
                const tapShapeName = tapShape.get("origin")._origin.name;
                this._unzoomTheChart(tapShapeName);
            }
        }
    }
}

Chart.registerInteraction('pie-zoom', PieZoom);
module.exports = PieZoom;
