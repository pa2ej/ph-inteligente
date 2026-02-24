/**
 * Badge / chip de estado.
 * @param {{ variant?: 'green'|'blue'|'yellow'|'red'|'gray'|'purple', children: React.ReactNode }} props
 */
const Badge = ({ variant = "gray", children, style = {} }) => (
  <span className={`badge badge-${variant}`} style={style}>
    {children}
  </span>
);

export default Badge;
