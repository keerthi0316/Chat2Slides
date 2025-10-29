"use client";

import { useState, useEffect } from "react";
import { get, set } from "idb-keyval"; // Import from idb-keyval

export default function NameInputModal() {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");

  useEffect(() => {
    // Check IndexedDB for name on mount
    const checkName = async () => {
      const storedName = await get("userName");
      if (!storedName) {
        setShowModal(true); // Show modal if no name is found
      }
    };
    checkName();
  }, []);

  const handleSaveName = async () => {
    if (name.trim()) {
      await set("userName", name.trim()); // Save to IndexedDB
      setShowModal(false);
      // Reload the page to ensure the main page's useEffect picks up the name
      window.location.reload();
    }
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
  <div className="rounded-lg bg-white p-8 shadow-xl border border-gray-200">
    <h2 className="mb-4 text-2xl font-semibold text-gray-900">Welcome!</h2>
    <p className="mb-4 text-gray-600">
      Please tell us your name so we can greet you.
    </p>
    <input
      type="text"
      className="mb-4 w-full rounded-md border border-gray-300 bg-gray-50 p-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      placeholder="Your Name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
    />
    <button
      onClick={handleSaveName}
      className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
      disabled={!name.trim()}
    >
      Continue
    </button>
  </div>
</div>

    // <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
    //   <div className="rounded-lg bg-gray-800 p-8 shadow-lg">
    //     <h2 className="mb-4 text-2xl font-bold text-white">Welcome!</h2>
    //     <p className="mb-4 text-gray-300">
    //       Please tell us your name so we can greet you.
    //     </p>
    //     <input
    //       type="text"
    //       className="mb-4 w-full rounded-md border border-gray-600 bg-gray-700 p-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
    //       placeholder="Your Name"
    //       value={name}
    //       onChange={(e) => setName(e.target.value)}
    //       onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
    //     />
    //     <button
    //       onClick={handleSaveName}
    //       className="w-full rounded-md bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-700 disabled:bg-gray-500"
    //       disabled={!name.trim()}
    //     >
    //       Continue
    //     </button>
    //   </div>
    // </div>
  );
}