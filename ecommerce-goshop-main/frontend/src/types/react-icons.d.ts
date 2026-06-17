import "react-icons/lib/iconBase";

declare module "react-icons/lib/iconBase" {
  export type IconType = (props: import("react-icons/lib/iconBase").IconBaseProps) => JSX.Element;
}