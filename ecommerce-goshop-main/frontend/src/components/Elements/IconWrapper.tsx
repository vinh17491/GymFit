import React from "react";

interface IconWrapperProps {
    icon: any;
    className?: string;
}

export const IconWrapper = ({ icon: Icon, className }: IconWrapperProps) => {
    return React.createElement(Icon, { className });
};
