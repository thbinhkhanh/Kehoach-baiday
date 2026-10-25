import React, { useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

export default function Viewer() {
  const containerRef = useRef(null);
  const urlParams = new URLSearchParams(window.location.search);
  const fileUrl = urlParams.get("url");

  useEffect(() => {
    const fetchAndRender = async () => {
      if (!fileUrl || !containerRef.current) return;

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      await renderAsync(arrayBuffer, containerRef.current, null, { debug: true });
    };

    fetchAndRender();
  }, [fileUrl]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Xem nội dung file Word</h2>
      <div
        ref={containerRef}
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          boxSizing: "border-box",
          minHeight: "80vh",
        }}
      />
    </div>
  );
}