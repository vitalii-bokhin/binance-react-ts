import React, { BaseSyntheticEvent, useEffect, useRef, useState } from 'react';
import { binanceApi, useGetCandlesTicksQuery, useGetDepthQuery } from '../../app/binanceApi';
import { DrawChart } from './DrawChart';
import css from './Chart.module.scss';
import { Coordinates } from './Coordinates';
import { useAlert } from 'react-alert';
import { useAppDispatch } from '../../app/hooks';
import { useNavigate, useParams } from 'react-router-dom';

// move
let startCursorPos = { X: 0, Y: 0 },
    pos = { X: 0, Y: 0 },
    newPos = { X: 0, Y: 0 };

const moveCanvas = function (contEl, moveXEls, moveYEls) {
    function move(e) {
        const dX = e.pageX - startCursorPos.X,
            posX = pos.X - dX,
            dY = e.pageY - startCursorPos.Y,
            posY = pos.Y + dY;

        for (let i = 0; i < moveXEls.length; i++) {
            moveXEls[i].style.right = posX + 'px';
        }

        for (let i = 0; i < moveYEls.length; i++) {
            moveYEls[i].style.top = posY + 'px';
        }

        newPos.X = posX;
        newPos.Y = posY;
    }

    function start(e) {
        contEl.classList.add(css.chartContainer_moving);

        startCursorPos.X = e.pageX;
        startCursorPos.Y = e.pageY;

        contEl.addEventListener('mousemove', move);
    }

    function stop() {
        contEl.classList.remove(css.chartContainer_moving);

        contEl.removeEventListener('mousemove', move);

        pos.X = newPos.X;
        pos.Y = newPos.Y;
    }

    contEl.addEventListener('mousedown', start);
    contEl.addEventListener('mouseup', stop);
}

const initDimesions = [4333, 1333];

export default function Chart(props?: { symbols?: string[] }) {
    const canvasDims = useRef<number[]>(initDimesions);
    const tradelinesDrawn = useRef<boolean>(false);
    const maxPriceRef = useRef<number>(0);
    const coordsInstRef = useRef<Coordinates>();
    const chartInstRef = useRef<DrawChart>();
    const containerRef = useRef<HTMLDivElement>();
    const canvInnerRef = useRef<HTMLDivElement>();
    const linesCanvasRef = useRef<HTMLCanvasElement>();
    const horVolCanvasRef = useRef<HTMLCanvasElement>();
    const depthCanvasRef = useRef<HTMLCanvasElement>();
    const priceScaleBarCanvasRef = useRef<HTMLCanvasElement>();
    const priceBarCanvasRef = useRef<HTMLCanvasElement>();

    const alert = useAlert();

    const { symbol } = useParams();
    const navigate = useNavigate();

    const dispatch = useAppDispatch();

    // const [symbol, setSymbol] = useState(null);
    const [interval, setInterval] = useState('5m');
    const [scale, setScale] = useState(0);

    const symbols = [...props.symbols] || ['WAVESUSDT', 'MATICUSDT'];

    // const { data: tradeList } = useGetTradesListQuery({ symbol, limit: 1000 }, { skip: !symbol });

    const { data } = useGetCandlesTicksQuery({ symbol, limit: 500, interval }, { skip: !symbol });
    const { data: depth } = useGetDepthQuery({ symbol, limit: 100 }, { skip: !symbol });

    useEffect(() => {
        const coords = new Coordinates({
            canvW: canvasDims.current[0],
            canvH: canvasDims.current[1],
        });

        coordsInstRef.current = coords;

        const chart = new DrawChart({
            canvInEl: canvInnerRef.current,
            linesCanvEl: linesCanvasRef.current,
            horVolumeCanvEl: horVolCanvasRef.current,
            depthCanvEl: depthCanvasRef.current,
            priceScaleBarCanvEl: priceScaleBarCanvasRef.current,
            priceBarCanvEl: priceBarCanvasRef.current,
            isShadow: false,
            canvasWidth: canvasDims.current[0],
            canvasHeight: canvasDims.current[1],
            coordsInstance: coords
        });

        chartInstRef.current = chart;

        moveCanvas(
            containerRef.current,
            containerRef.current.querySelectorAll('.move-axis-x'),
            containerRef.current.querySelectorAll('.move-axis-y')
        );
    }, []);

    useEffect(() => {
        canvasDims.current = [
            initDimesions[0] + scale,
            initDimesions[1] + scale,
        ];

        coordsInstRef.current.canvW = canvasDims.current[0];
        coordsInstRef.current.canvH = canvasDims.current[1];

        chartInstRef.current.canvasWidth = canvasDims.current[0];
        chartInstRef.current.canvasHeight = canvasDims.current[1];
        chartInstRef.current.reInit();
    }, [scale]);

    // useEffect(() => {
    //     if (tradeList && maxPriceRef.current > 0) {
    //         chartInstRef.current.drawHorVolume(tradeList);
    //     }
    // }, [tradeList, maxPriceRef.current]);

    useEffect(() => {
        // if (isInitialMount.current) {
        //     isInitialMount.current = false;

        //     // chartShadow = new DrawChart(canvInnerRef.current, linesCanvasRef.current, priceScaleBarCanvasRef.current, priceBarCanvasRef.current, true);

        // }

        // chartShadow.draw(props.shadowCandles);

        if (data && data.length) {

            if (maxPriceRef.current === 0) {
                let minPrice = 999999;
                let maxPrice = 0;

                for (const cdl of data) {
                    if (cdl.low < minPrice) {
                        minPrice = cdl.low;
                    }

                    if (cdl.high > maxPrice) {
                        maxPrice = cdl.high;
                    }
                }

                coordsInstRef.current.maxPrice = maxPrice + ((maxPrice - minPrice) / 4);
                coordsInstRef.current.minPrice = minPrice - ((maxPrice - minPrice) / 4);

                const minTime = data[0].openTime;
                const maxTime = data.slice(-1)[0].openTime;

                coordsInstRef.current.minTime = minTime;
                coordsInstRef.current.maxTime = maxTime + ((maxTime - minTime) / 4);

                chartInstRef.current.minPrice = minPrice;
                chartInstRef.current.maxPrice = maxPrice;

                maxPriceRef.current = maxPrice;
            }

            chartInstRef.current.draw(data, null, false);

        }
    }, [data]);

    useEffect(() => {
        if (depth && maxPriceRef.current > 0) {
            chartInstRef.current.drawDepth(depth, symbol);
        }
    }, [depth, maxPriceRef.current]);

    const selectSymbol = function (e: BaseSyntheticEvent) {
        maxPriceRef.current = 0;
        // setSymbol(e.target.value);
        dispatch(binanceApi.util.resetApiState());
        navigate('/chart/' + e.target.value);
    }

    const selectInterval = function (val: string) {
        maxPriceRef.current = 0;
        setInterval(val);
    }

    symbols && symbols.sort((a: string, b: string) => {
        if (a < b) { return -1; }
        if (a > b) { return 1; }
        return 0;
    });

    const selOpt = symbols && symbols.map(s => React.createElement('option', { key: s }, s));

    return (
        <div ref={containerRef} className={css.chartContainer}>
            <div className={css.canvasContainer}>
                <div className={css.canvasWrap}>
                    <div className={css.canvasWrap__inner + ' move-axis-y'}>
                        <div ref={canvInnerRef} className={css.canvasWrap__inner + ' move-axis-x'}></div>
                        <canvas ref={linesCanvasRef} className={css.linesCanvas}></canvas>
                        <canvas ref={horVolCanvasRef} className={css.horVolumeCanvas}></canvas>
                        <canvas ref={depthCanvasRef} className={css.depthCanvas}></canvas>
                    </div>
                </div>

                <div className={css.rightBar}>
                    <div className={css.rightBar__inner + ' move-axis-y'}>
                        <canvas ref={priceScaleBarCanvasRef} className={css.priceScaleBar}></canvas>
                        <canvas ref={priceBarCanvasRef} className={css.priceBar}></canvas>
                    </div>
                </div>
            </div>

            <select onChange={selectSymbol} className={css.select}>
                <option></option>
                {selOpt}
            </select>

            <div className={css.intervalButtons}>
                <button
                    onClick={() => selectInterval('1m')}
                    className={interval === '1m' ? css.btnActive : undefined}
                >1m</button>

                <button
                    onClick={() => selectInterval('5m')}
                    className={interval === '5m' ? css.btnActive : undefined}
                >*5m*</button>

                <button
                    onClick={() => selectInterval('1h')}
                    className={interval === '1h' ? css.btnActive : undefined}
                >1h</button>
            </div>

            {/* <div className={css.scaleButtons}>
                <button onClick={() => setScale(scale - 100)}>-</button>
                <button onClick={() => setScale(scale + 100)}>+</button>
                <button onClick={() => setScale(0)}>reset</button>
            </div> */}
        </div>
    );
}