"use client";
/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PlusCircle } from "react-feather";
import { DatePicker } from "antd";

// Dynamically import heavy libraries
const Select = dynamic(() => import("react-select"), { ssr: false });
const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });
const Slider = dynamic(() => import("react-slick"), { ssr: false });

export default function FileManagerComponent() {
  const [isOpen, setIsOpen] = useState(false);

  const video = {
    dots: false,
    autoplay: false,
    slidesToShow: 2,
    slidesToScroll: 1,
    margin: 24,
    speed: 500,
    arrows: true,
    infinite: true,
    responsive: [
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 800,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 776,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 567,
        settings: {
          slidesToShow: 2,
        },
      },
    ],
  };

  const chartOptions = {
    chart: {
      height: 200,
      type: "donut",
      toolbar: {
        show: false,
      },
      offsetY: -10,
    },
    plotOptions: {
      pie: {
        startAngle: -100,
        endAngle: 100,
        donut: {
          size: "80%",
          labels: {
            show: true,
            name: {
              show: true,
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    stroke: {
      show: false,
    },
    colors: ["#0C4B5E", "#FFC107", "#1B84FF", "#AB47BC", "#FD3995"],
    series: [20, 20, 20, 20, 20],
    labels: ["Documents", "Video", "Music", "Photos", "Other"],
    responsive: [
      {
        breakpoint: 480,
        options: {
          chart: {
            width: 200,
          },
          legend: {
            position: "bottom",
          },
        },
      },
    ],
    grid: {
      padding: {
        bottom: -60,
      },
    },
  };

  return (
    <>
      <div
        className={`page-wrapper notes-page-wrapper file-manager ${
          isOpen && "notes-tag-left"
        }`}
      >
        <div className="content">
          <div className="page-header page-add-notes border-0 flex-sm-row flex-column">
            <div className="add-item d-flex">
              <div className="page-title">
                <h4>File Manager</h4>
                <h6 className="mb-0">Manage your files</h6>
              </div>
            </div>
            <div className="d-flex flex-sm-row flex-column align-items-sm-center align-items-start">
              <div className="form-sort mx-2">
                <Select
                  classNamePrefix="react-select"
                  options={[
                    { value: "option1", label: "Option 1" },
                    { value: "option2", label: "Option 2" },
                  ]}
                  placeholder="Choose"
                />
              </div>
              <div className="page-btn">
                <Link
                  href="#"
                  className="btn btn-primary"
                  data-bs-toggle="modal"
                  data-bs-target="#add_folder"
                >
                  <PlusCircle className="me-2" /> Create Folder
                </Link>
              </div>
            </div>
          </div>

          <div className="row">
            {/* Example Storage Card */}
            <div className="col-lg-3 col-md-6 d-flex">
              <div className="card bg-lightdanger-gradient flex-fill">
                <div className="card-body">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center">
                      <img src="assets/img/icons/dropbox.svg" alt="Dropbox" />
                      <h5 className="ms-2">Dropbox</h5>
                    </div>
                  </div>
                  <div className="progress progress-xs flex-grow-1 mb-2">
                    <div
                      className="progress-bar bg-pink rounded"
                      role="progressbar"
                      style={{ width: "20%" }}
                      aria-valuenow={30}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <p className="mb-0">200 Files</p>
                    <p className="text-title mb-0">28GB</p>
                  </div>
                </div>
              </div>
            </div>
            {/* /Example Storage Card */}
          </div>

          {/* Chart Example */}
          <div className="card">
            <div className="card-body">
              <h4>Storage Details</h4>
              {/* <ReactApexChart
                options={chartOptions}
                series={chartOptions.series}
                type="donut"
                height={200}
              /> */}
            </div>
          </div>

          {/* Video Slider */}
          <div className="card">
            <div className="card-body">
              <h4>Recent Videos</h4>
              <Slider {...video}>
                <div>
                  <video
                    width="100%"
                    height="100%"
                    controls
                    poster="assets/img/file-manager/video-01.jpg"
                  >
                    <source
                      src="https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4"
                      type="video/mp4"
                    />
                  </video>
                </div>
                <div>
                  <video
                    width="100%"
                    height="100%"
                    controls
                    poster="assets/img/file-manager/video-02.jpg"
                  >
                    <source
                      src="https://cdn.plyr.io/static/demo/View_From_A_Blue_Moon_Trailer-720p.mp4"
                      type="video/mp4"
                    />
                  </video>
                </div>
              </Slider>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}